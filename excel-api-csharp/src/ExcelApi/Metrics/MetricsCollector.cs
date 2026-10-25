using System.Collections.Concurrent;
using System.Text;

namespace BigBytes.ExcelApi.Metrics;

/// <summary>
/// Prometheus exposition metrics: per-status request counters and duration
/// histograms plus uptime. Single-node, in-process.
/// </summary>
public class MetricsCollector
{
    private static readonly double[] HistogramBucketsMs = { 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000 };

    private readonly DateTime _startTime = DateTime.UtcNow;
    private readonly ConcurrentDictionary<string, long> _requests = new();
    private readonly ConcurrentDictionary<string, Histogram> _durations = new();
    private readonly ConcurrentDictionary<string, long> _endpointRequests = new();
    private readonly ConcurrentDictionary<string, Histogram> _endpointDurations = new();
    private readonly ConcurrentDictionary<string, long> _errors = new();
    private readonly ConcurrentDictionary<string, long> _queueDepth = new();

    public void RecordRequest(string method, int status, double durationMs)
    {
        var key = $"{method}|{status}";
        _requests.AddOrUpdate(key, 1, (_, v) => v + 1);
        _durations.GetOrAdd(key, _ => new Histogram()).Observe(durationMs);
        if (status >= 400)
        {
            _errors.AddOrUpdate(status.ToString(), 1, (_, v) => v + 1);
        }
    }

    public void RecordEndpoint(string endpoint, double durationMs)
    {
        _endpointRequests.AddOrUpdate(endpoint, 1, (_, v) => v + 1);
        _endpointDurations.GetOrAdd(endpoint, _ => new Histogram()).Observe(durationMs);
    }

    public void SetQueueDepth(string workbookId, long depth)
    {
        _queueDepth[workbookId] = depth;
    }

    public string ToExposition()
    {
        var sb = new StringBuilder();
        var uptimeSeconds = (DateTime.UtcNow - _startTime).TotalSeconds;

        sb.AppendLine("# HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds");
        sb.AppendLine("# TYPE excel_api_uptime_seconds gauge");
        sb.AppendLine(FormattableString.Invariant($"excel_api_uptime_seconds {uptimeSeconds:F3}"));

        sb.AppendLine("# HELP excel_api_http_requests_total Total HTTP requests");
        sb.AppendLine("# TYPE excel_api_http_requests_total counter");
        foreach (var (key, count) in _requests)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"excel_api_http_requests_total{LabelsFromKey(key)} {count}"));
        }

        sb.AppendLine("# HELP excel_api_http_request_duration_ms HTTP request duration in milliseconds");
        sb.AppendLine("# TYPE excel_api_http_request_duration_ms histogram");
        foreach (var (key, histogram) in _durations)
        {
            var labels = LabelsFromKey(key);
            var prefix = string.IsNullOrEmpty(labels) ? "" : labels + ",";
            var snapshot = histogram.Snapshot();
            for (var i = 0; i < HistogramBucketsMs.Length; i++)
            {
                sb.AppendLine(FormattableString.Invariant(
                    $"excel_api_http_request_duration_ms_bucket{{{prefix}le=\"{FmtBound(HistogramBucketsMs[i])}\"}} {snapshot.Buckets[i]}"));
            }
            sb.AppendLine(FormattableString.Invariant(
                $"excel_api_http_request_duration_ms_bucket{{{prefix}le=\"+Inf\"}} {snapshot.Count}"));
            sb.AppendLine(FormattableString.Invariant(
                $"excel_api_http_request_duration_ms_sum{labels} {snapshot.Sum:F3}"));
            sb.AppendLine(FormattableString.Invariant(
                $"excel_api_http_request_duration_ms_count{labels} {snapshot.Count}"));
        }

        foreach (var (endpoint, count) in _endpointRequests)
        {
            var name = $"excel_api_{endpoint}_requests_total";
            sb.AppendLine($"# HELP {name} Requests to the {endpoint} endpoint");
            sb.AppendLine($"# TYPE {name} counter");
            sb.AppendLine(FormattableString.Invariant($"{name} {count}"));
        }
        foreach (var (endpoint, histogram) in _endpointDurations)
        {
            var name = $"excel_api_{endpoint}_duration_ms";
            sb.AppendLine($"# HELP {name} {endpoint} request duration in milliseconds");
            sb.AppendLine($"# TYPE {name} histogram");
            var snapshot = histogram.Snapshot();
            for (var i = 0; i < HistogramBucketsMs.Length; i++)
            {
                sb.AppendLine(FormattableString.Invariant(
                    $"{name}_bucket{{le=\"{FmtBound(HistogramBucketsMs[i])}\"}} {snapshot.Buckets[i]}"));
            }
            sb.AppendLine(FormattableString.Invariant($"{name}_bucket{{le=\"+Inf\"}} {snapshot.Count}"));
            sb.AppendLine(FormattableString.Invariant($"{name}_sum {snapshot.Sum:F3}"));
            sb.AppendLine(FormattableString.Invariant($"{name}_count {snapshot.Count}"));
        }

        sb.AppendLine("# HELP excel_api_errors_total Total error responses");
        sb.AppendLine("# TYPE excel_api_errors_total counter");
        if (_errors.IsEmpty)
        {
            sb.AppendLine("excel_api_errors_total{status=\"0\"} 0");
        }
        else
        {
            foreach (var (status, count) in _errors)
            {
                sb.AppendLine(FormattableString.Invariant(
                    $"excel_api_errors_total{{status=\"{status}\"}} {count}"));
            }
        }

        sb.AppendLine("# HELP excel_api_queue_depth Pending and running write queue operations");
        sb.AppendLine("# TYPE excel_api_queue_depth gauge");
        foreach (var (workbook, depth) in _queueDepth)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"excel_api_queue_depth{{workbook=\"{workbook}\"}} {depth}"));
        }

        sb.AppendLine("# HELP excel_api_implementation_info Implementation information");
        sb.AppendLine("# TYPE excel_api_implementation_info gauge");
        sb.AppendLine("excel_api_implementation_info{implementation=\"excel-api-csharp\"} 1");

        return sb.ToString();
    }

    private static string LabelsFromKey(string key)
    {
        var sep = key.IndexOf('|');
        if (sep < 0) return "";
        return $"{{method=\"{key[..sep]}\",status=\"{key[(sep + 1)..]}\"}}";
    }

    private static string FmtBound(double bound)
        => bound == Math.Floor(bound)
            ? ((long)bound).ToString()
            : bound.ToString(System.Globalization.CultureInfo.InvariantCulture);

    private sealed class Histogram
    {
        private long _count;
        private double _sum;
        private readonly long[] _buckets = new long[HistogramBucketsMs.Length];

        public void Observe(double value)
        {
            Interlocked.Increment(ref _count);
            lock (_buckets)
            {
                _sum += value;
                for (var i = 0; i < HistogramBucketsMs.Length; i++)
                {
                    if (value <= HistogramBucketsMs[i])
                    {
                        _buckets[i]++;
                    }
                }
            }
        }

        public (long Count, double Sum, long[] Buckets) Snapshot()
        {
            lock (_buckets)
            {
                return (Interlocked.Read(ref _count), _sum, (long[])_buckets.Clone());
            }
        }
    }
}
