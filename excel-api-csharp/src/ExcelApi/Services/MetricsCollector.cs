using System.Collections.Concurrent;
using System.Text;

namespace BigBytes.ExcelApi.Services;

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

    public void RecordRequest(string method, int status, double durationMs)
    {
        var key = $"{method}|{status}";
        _requests.AddOrUpdate(key, 1, (_, v) => v + 1);
        _durations.GetOrAdd(key, _ => new Histogram()).Observe(durationMs);
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
