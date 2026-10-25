package pl.alyx.api.excel.observability;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Prometheus exposition metrics: per-status request counters and duration
 * histograms plus uptime. Single-node, in-process — see docs/ARCHITECTURE.md.
 */
@Component
public class MetricsCollector {

    private static final int HTTP_ERROR_THRESHOLD = 400;

    private static final double[] HISTOGRAM_BUCKETS_MS = {5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000};

    private final long startTime = System.currentTimeMillis();
    private final Map<String, AtomicLong> requests = new ConcurrentHashMap<>();
    private final Map<String, Histogram> durations = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> endpointRequests = new ConcurrentHashMap<>();
    private final Map<String, Histogram> endpointDurations = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> errors = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> queueDepth = new ConcurrentHashMap<>();

    public void recordRequest(final String method, final int status, final double durationMs) {
        final String key = method + "|" + status;
        requests.computeIfAbsent(key, k -> new AtomicLong()).incrementAndGet();
        durations.computeIfAbsent(key, k -> new Histogram()).observe(durationMs);
        if (status >= HTTP_ERROR_THRESHOLD) {
            errors.computeIfAbsent(String.valueOf(status), k -> new AtomicLong()).incrementAndGet();
        }
    }

    public void recordEndpoint(final String endpoint, final double durationMs) {
        endpointRequests.computeIfAbsent(endpoint, k -> new AtomicLong()).incrementAndGet();
        endpointDurations.computeIfAbsent(endpoint, k -> new Histogram()).observe(durationMs);
    }

    public void setQueueDepth(final String workbookId, final long depth) {
        queueDepth.computeIfAbsent(workbookId, k -> new AtomicLong()).set(depth);
    }

    public String toExposition() {
        final StringBuilder sb = new StringBuilder();
        final double uptimeSeconds = (System.currentTimeMillis() - startTime) / 1000.0;

        sb.append("# HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds\n");
        sb.append("# TYPE excel_api_uptime_seconds gauge\n");
        sb.append(String.format("excel_api_uptime_seconds %.3f%n", uptimeSeconds));

        sb.append("# HELP excel_api_http_requests_total Total HTTP requests\n");
        sb.append("# TYPE excel_api_http_requests_total counter\n");
        requests.forEach((key, count) ->
                sb.append(String.format(
                        "excel_api_http_requests_total%s %d%n",
                        labelsFromKey(key), count.get())));

        sb.append("# HELP excel_api_http_request_duration_ms HTTP request duration in milliseconds\n");
        sb.append("# TYPE excel_api_http_request_duration_ms histogram\n");
        durations.forEach((key, histogram) -> {
            final String labels = labelsFromKey(key);
            for (int i = 0; i < HISTOGRAM_BUCKETS_MS.length; i++) {
                sb.append(String.format(
                        "excel_api_http_request_duration_ms_bucket{%sle=\"%s\"} %d%n",
                        labels.isEmpty() ? "" : labels + ",", fmtBound(HISTOGRAM_BUCKETS_MS[i]),
                        histogram.buckets[i].get()));
            }
            sb.append(String.format(
                    "excel_api_http_request_duration_ms_bucket{%sle=\"+Inf\"} %d%n",
                    labels.isEmpty() ? "" : labels + ",", histogram.count.get()));
            sb.append(String.format(
                    "excel_api_http_request_duration_ms_sum%s %.3f%n", labels, histogram.sum.sum()));
            sb.append(String.format(
                    "excel_api_http_request_duration_ms_count%s %d%n", labels, histogram.count.get()));
        });

        endpointRequests.forEach((endpoint, count) -> {
            final String name = "excel_api_" + endpoint + "_requests_total";
            sb.append("# HELP ").append(name).append(" Requests to the ").append(endpoint)
                    .append(" endpoint\n");
            sb.append("# TYPE ").append(name).append(" counter\n");
            sb.append(String.format("%s %d%n", name, count.get()));
        });
        endpointDurations.forEach((endpoint, histogram) -> {
            final String name = "excel_api_" + endpoint + "_duration_ms";
            sb.append("# HELP ").append(name).append(" ").append(endpoint)
                    .append(" request duration in milliseconds\n");
            sb.append("# TYPE ").append(name).append(" histogram\n");
            for (int i = 0; i < HISTOGRAM_BUCKETS_MS.length; i++) {
                sb.append(String.format("%s_bucket{le=\"%s\"} %d%n",
                        name, fmtBound(HISTOGRAM_BUCKETS_MS[i]), histogram.buckets[i].get()));
            }
            sb.append(String.format("%s_bucket{le=\"+Inf\"} %d%n", name, histogram.count.get()));
            sb.append(String.format("%s_sum %.3f%n", name, histogram.sum.sum()));
            sb.append(String.format("%s_count %d%n", name, histogram.count.get()));
        });

        sb.append("# HELP excel_api_errors_total Total error responses\n");
        sb.append("# TYPE excel_api_errors_total counter\n");
        errors.forEach((status, count) -> sb.append(String.format(
                "excel_api_errors_total{status=\"%s\"} %d%n", status, count.get())));

        sb.append("# HELP excel_api_queue_depth Pending and running write queue operations\n");
        sb.append("# TYPE excel_api_queue_depth gauge\n");
        queueDepth.forEach((workbook, depth) -> sb.append(String.format(
                "excel_api_queue_depth{workbook=\"%s\"} %d%n", workbook, depth.get())));

        return sb.toString();
    }

    private static String labelsFromKey(final String key) {
        final int sep = key.indexOf('|');
        if (sep == -1) {
            return "";
        }
        return "{method=\"" + key.substring(0, sep) + "\",status=\"" + key.substring(sep + 1) + "\"}";
    }

    private static String fmtBound(final double bound) {
        return bound == Math.floor(bound) ? String.valueOf((long) bound) : String.valueOf(bound);
    }

    private static final class Histogram {
        private final AtomicLong count = new AtomicLong();
        private final java.util.concurrent.atomic.DoubleAdder sum =
                new java.util.concurrent.atomic.DoubleAdder();
        private final AtomicLong[] buckets = new AtomicLong[HISTOGRAM_BUCKETS_MS.length];

        Histogram() {
            for (int i = 0; i < buckets.length; i++) {
                buckets[i] = new AtomicLong();
            }
        }

        void observe(final double value) {
            count.incrementAndGet();
            sum.add(value);
            for (int i = 0; i < HISTOGRAM_BUCKETS_MS.length; i++) {
                if (value <= HISTOGRAM_BUCKETS_MS[i]) {
                    buckets[i].incrementAndGet();
                }
            }
        }
    }
}
