// Metrics collector for usage and performance statistics

interface Histogram {
  count: number;
  sum: number;
  // Cumulative counts aligned with HISTOGRAM_BUCKETS (+Infinity implied by count)
  buckets: number[];
}

interface Labels {
  [key: string]: string;
}

// Duration histogram boundaries in milliseconds
const HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private startTime: number = Date.now();

  incrementCounter(name: string, value: number = 1, labels?: Labels): void {
    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  setGauge(name: string, value: number, labels?: Labels): void {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  observeHistogram(name: string, value: number, labels?: Labels): void {
    const key = this.makeKey(name, labels);
    const histogram = this.histograms.get(key) ?? {
      count: 0,
      sum: 0,
      buckets: new Array(HISTOGRAM_BUCKETS.length).fill(0) as number[],
    };
    histogram.count++;
    histogram.sum += value;
    for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
      if (value <= HISTOGRAM_BUCKETS[i]) {
        histogram.buckets[i]++;
      }
    }
    this.histograms.set(key, histogram);
  }

  // Key format: "name|labelK=\"v\",labelK2=\"v2\"" — name alone when no labels
  private makeKey(name: string, labels?: Labels): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}|${labelStr}`;
  }

  private splitKey(key: string): { name: string; labelStr: string } {
    const sep = key.indexOf('|');
    if (sep === -1) return { name: key, labelStr: '' };
    return { name: key.slice(0, sep), labelStr: key.slice(sep + 1) };
  }

  private groupByName<T>(map: Map<string, T>): Map<string, Array<{ labelStr: string; value: T }>> {
    const grouped = new Map<string, Array<{ labelStr: string; value: T }>>();
    for (const [key, value] of map.entries()) {
      const { name, labelStr } = this.splitKey(key);
      const entries = grouped.get(name) ?? [];
      entries.push({ labelStr, value });
      grouped.set(name, entries);
    }
    return grouped;
  }

  private sampleLine(name: string, labelStr: string, suffix = ''): string {
    return labelStr ? `${name}${suffix}{${labelStr}}` : `${name}${suffix}`;
  }

  toOpenMetrics(): string {
    const lines: string[] = [];
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;

    lines.push('# HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds');
    lines.push('# TYPE excel_api_uptime_seconds gauge');
    lines.push(`excel_api_uptime_seconds ${uptimeSeconds.toFixed(3)}`);

    lines.push('# HELP excel_api_implementation_info Implementation information');
    lines.push('# TYPE excel_api_implementation_info gauge');
    lines.push('excel_api_implementation_info{implementation="excel-api-node"} 1');

    for (const [name, entries] of this.groupByName(this.counters).entries()) {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      for (const { labelStr, value } of entries) {
        lines.push(`${this.sampleLine(name, labelStr)} ${value}`);
      }
    }

    for (const [name, entries] of this.groupByName(this.gauges).entries()) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      for (const { labelStr, value } of entries) {
        lines.push(`${this.sampleLine(name, labelStr)} ${value}`);
      }
    }

    for (const [name, entries] of this.groupByName(this.histograms).entries()) {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      for (const { labelStr, value } of entries) {
        for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
          const labels = labelStr ? `${labelStr},le="${HISTOGRAM_BUCKETS[i]}"` : `le="${HISTOGRAM_BUCKETS[i]}"`;
          lines.push(`${name}_bucket{${labels}} ${value.buckets[i]}`);
        }
        const infLabels = labelStr ? `${labelStr},le="+Inf"` : 'le="+Inf"';
        lines.push(`${name}_bucket{${infLabels}} ${value.count}`);
        lines.push(this.sampleLine(name, labelStr, '_sum') + ` ${value.sum.toFixed(3)}`);
        lines.push(this.sampleLine(name, labelStr, '_count') + ` ${value.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
