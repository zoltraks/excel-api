// Metrics collector for usage and performance statistics

interface Histogram {
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private startTime: number = Date.now();

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.makeKey(name, labels);
    const histogram = this.histograms.get(key) ?? {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: [],
    };
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
    histogram.values.push(value);
    // Keep only last 1000 values for memory efficiency
    if (histogram.values.length > 1000) {
      histogram.values.shift();
    }
    this.histograms.set(key, histogram);
  }

  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  toOpenMetrics(): string {
    const lines: string[] = [];
    const now = Date.now() / 1000;

    // Add uptime metric
    lines.push(`# HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds`);
    lines.push(`# TYPE excel_api_uptime_seconds gauge`);
    lines.push(`excel_api_uptime_seconds ${(now - this.startTime / 1000).toFixed(3)} ${now.toFixed(3)}`);

    // Add counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`# HELP ${key} Counter metric`);
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${key} ${value} ${now.toFixed(3)}`);
    }

    // Add gauges
    for (const [key, value] of this.gauges.entries()) {
      lines.push(`# HELP ${key} Gauge metric`);
      lines.push(`# TYPE ${key} gauge`);
      lines.push(`${key} ${value} ${now.toFixed(3)}`);
    }

    // Add histograms
    for (const [key, histogram] of this.histograms.entries()) {
      const p50 = this.calculatePercentile(histogram.values, 50);
      const p95 = this.calculatePercentile(histogram.values, 95);
      const p99 = this.calculatePercentile(histogram.values, 99);

      lines.push(`# HELP ${key} Histogram metric`);
      lines.push(`# TYPE ${key} histogram`);
      lines.push(`${key}_count ${histogram.count} ${now.toFixed(3)}`);
      lines.push(`${key}_sum ${histogram.sum.toFixed(3)} ${now.toFixed(3)}`);
      lines.push(`${key}_min ${histogram.min.toFixed(3)} ${now.toFixed(3)}`);
      lines.push(`${key}_max ${histogram.max.toFixed(3)} ${now.toFixed(3)}`);
      lines.push(`${key}_p50 ${p50.toFixed(3)} ${now.toFixed(3)}`);
      lines.push(`${key}_p95 ${p95.toFixed(3)} ${now.toFixed(3)}`);
      lines.push(`${key}_p99 ${p99.toFixed(3)} ${now.toFixed(3)}`);
    }

    return lines.join('\n') + '\n';
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
