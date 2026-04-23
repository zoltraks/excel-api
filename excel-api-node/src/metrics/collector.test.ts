// Metrics collector unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import { metrics } from './collector.js';

describe('Metrics Collector', () => {
  beforeEach(() => {
    // Reset the singleton instance by clearing internal maps
    (metrics as { counters: Map<string, number> }).counters.clear();
    (metrics as { gauges: Map<string, number> }).gauges.clear();
    (metrics as { histograms: Map<string, unknown> }).histograms.clear();
  });

  it('should increment counter with default value', () => {
    metrics.incrementCounter('test_counter');
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_counter 1');
  });

  it('should increment counter with custom value', () => {
    metrics.incrementCounter('test_counter', 5);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_counter 5');
  });

  it('should increment counter multiple times', () => {
    metrics.incrementCounter('test_counter', 2);
    metrics.incrementCounter('test_counter', 3);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_counter 5');
  });

  it('should increment counter with labels', () => {
    metrics.incrementCounter('test_counter', 1, { method: 'GET', status: '200' });
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_counter{method="GET",status="200"} 1');
  });

  it('should set gauge value', () => {
    metrics.setGauge('test_gauge', 42);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_gauge 42');
  });

  it('should update gauge value', () => {
    metrics.setGauge('test_gauge', 42);
    metrics.setGauge('test_gauge', 100);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_gauge 100');
  });

  it('should set gauge with labels', () => {
    metrics.setGauge('test_gauge', 50, { endpoint: '/api/v1/workbooks' });
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_gauge{endpoint="/api/v1/workbooks"} 50');
  });

  it('should observe histogram value', () => {
    metrics.observeHistogram('test_histogram', 100);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_histogram_count 1');
    expect(output).toContain('test_histogram_sum 100');
    expect(output).toContain('test_histogram_min 100');
    expect(output).toContain('test_histogram_max 100');
  });

  it('should observe multiple histogram values', () => {
    metrics.observeHistogram('test_histogram', 100);
    metrics.observeHistogram('test_histogram', 200);
    metrics.observeHistogram('test_histogram', 150);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_histogram_count 3');
    expect(output).toContain('test_histogram_sum 450');
    expect(output).toContain('test_histogram_min 100');
    expect(output).toContain('test_histogram_max 200');
  });

  it('should calculate histogram percentiles', () => {
    metrics.observeHistogram('test_histogram', 10);
    metrics.observeHistogram('test_histogram', 20);
    metrics.observeHistogram('test_histogram', 30);
    metrics.observeHistogram('test_histogram', 40);
    metrics.observeHistogram('test_histogram', 50);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_histogram_p50');
    expect(output).toContain('test_histogram_p95');
    expect(output).toContain('test_histogram_p99');
  });

  it('should observe histogram with labels', () => {
    metrics.observeHistogram('test_histogram', 100, { operation: 'read_cell' });
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_histogram{operation="read_cell"}_count 1');
  });

  it('should limit histogram values to 1000 for memory efficiency', () => {
    for (let i = 0; i < 1100; i++) {
      metrics.observeHistogram('test_histogram', i);
    }
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_histogram_count 1100');
  });

  it('should include uptime metric in OpenMetrics output', () => {
    const output = metrics.toOpenMetrics();
    expect(output).toContain('excel_api_uptime_seconds');
    expect(output).toContain('# TYPE excel_api_uptime_seconds gauge');
  });

  it('should format OpenMetrics with proper metadata', () => {
    metrics.incrementCounter('test_counter', 5);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('# HELP test_counter Counter metric');
    expect(output).toContain('# TYPE test_counter counter');
  });

  it('should format histogram OpenMetrics with proper metadata', () => {
    metrics.observeHistogram('test_histogram', 100);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('# HELP test_histogram Histogram metric');
    expect(output).toContain('# TYPE test_histogram histogram');
  });

  it('should handle empty histogram', () => {
    metrics.observeHistogram('test_histogram', 0);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('test_histogram_count 1');
    expect(output).toContain('test_histogram_p50 0');
  });

  it('should track multiple independent counters', () => {
    metrics.incrementCounter('counter_a', 10);
    metrics.incrementCounter('counter_b', 20);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('counter_a 10');
    expect(output).toContain('counter_b 20');
  });

  it('should track multiple independent gauges', () => {
    metrics.setGauge('gauge_a', 10);
    metrics.setGauge('gauge_b', 20);
    const output = metrics.toOpenMetrics();
    expect(output).toContain('gauge_a 10');
    expect(output).toContain('gauge_b 20');
  });
});
