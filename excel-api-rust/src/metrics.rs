// Metrics collector and OpenMetrics/Prometheus exposition.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

const HISTOGRAM_BUCKETS: [f64; 10] = [
    5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0,
];

#[derive(Default)]
struct Histogram {
    count: u64,
    sum: f64,
    buckets: Vec<u64>,
}

#[derive(Default)]
struct Store {
    counters: HashMap<String, f64>,
    gauges: HashMap<String, f64>,
    histograms: HashMap<String, Histogram>,
}

pub struct Metrics {
    store: Mutex<Store>,
    started: Instant,
}

fn make_key(name: &str, labels: &[(&str, &str)]) -> String {
    if labels.is_empty() {
        return name.to_string();
    }
    let label_str = labels
        .iter()
        .map(|(k, v)| format!("{k}=\"{v}\""))
        .collect::<Vec<_>>()
        .join(",");
    format!("{name}|{label_str}")
}

impl Metrics {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(Store::default()),
            started: Instant::now(),
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Store> {
        self.store
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    pub fn increment(&self, name: &str, value: f64, labels: &[(&str, &str)]) {
        *self
            .lock()
            .counters
            .entry(make_key(name, labels))
            .or_insert(0.0) += value;
    }

    pub fn set_gauge(&self, name: &str, value: f64, labels: &[(&str, &str)]) {
        self.lock().gauges.insert(make_key(name, labels), value);
    }

    pub fn observe(&self, name: &str, value: f64, labels: &[(&str, &str)]) {
        let mut store = self.lock();
        let hist = store
            .histograms
            .entry(make_key(name, labels))
            .or_insert_with(|| Histogram {
                count: 0,
                sum: 0.0,
                buckets: vec![0; HISTOGRAM_BUCKETS.len()],
            });
        hist.count += 1;
        hist.sum += value;
        for (i, bound) in HISTOGRAM_BUCKETS.iter().enumerate() {
            if value <= *bound {
                hist.buckets[i] += 1;
            }
        }
    }

    pub fn to_open_metrics(&self) -> String {
        let store = self.lock();
        let mut out = String::new();
        let uptime = self.started.elapsed().as_secs_f64();
        out.push_str("# HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds\n");
        out.push_str("# TYPE excel_api_uptime_seconds gauge\n");
        out.push_str(&format!("excel_api_uptime_seconds {uptime:.3}\n"));
        out.push_str("# HELP excel_api_implementation_info Implementation information\n");
        out.push_str("# TYPE excel_api_implementation_info gauge\n");
        out.push_str("excel_api_implementation_info{implementation=\"excel-api-rust\"} 1\n");

        let mut grouped: HashMap<String, Vec<(String, f64)>> = HashMap::new();
        for (key, value) in &store.counters {
            let (name, labels) = key.split_once('|').unwrap_or((key.as_str(), ""));
            grouped
                .entry(name.to_string())
                .or_default()
                .push((labels.to_string(), *value));
        }
        for (name, entries) in &grouped {
            out.push_str(&format!(
                "# HELP {name} Counter metric\n# TYPE {name} counter\n"
            ));
            for (labels, value) in entries {
                if labels.is_empty() {
                    out.push_str(&format!("{name} {value}\n"));
                } else {
                    out.push_str(&format!("{name}{{{labels}}} {value}\n"));
                }
            }
        }
        let mut gauge_grouped: HashMap<String, Vec<(String, f64)>> = HashMap::new();
        for (key, value) in &store.gauges {
            let (name, labels) = key.split_once('|').unwrap_or((key.as_str(), ""));
            gauge_grouped
                .entry(name.to_string())
                .or_default()
                .push((labels.to_string(), *value));
        }
        for (name, entries) in &gauge_grouped {
            out.push_str(&format!(
                "# HELP {name} Gauge metric\n# TYPE {name} gauge\n"
            ));
            for (labels, value) in entries {
                if labels.is_empty() {
                    out.push_str(&format!("{name} {value}\n"));
                } else {
                    out.push_str(&format!("{name}{{{labels}}} {value}\n"));
                }
            }
        }

        let mut hist_grouped: HashMap<String, Vec<(String, &Histogram)>> = HashMap::new();
        for (key, value) in &store.histograms {
            let (name, labels) = key.split_once('|').unwrap_or((key.as_str(), ""));
            hist_grouped
                .entry(name.to_string())
                .or_default()
                .push((labels.to_string(), value));
        }
        for (name, entries) in &hist_grouped {
            out.push_str(&format!(
                "# HELP {name} Histogram metric\n# TYPE {name} histogram\n"
            ));
            for (labels, hist) in entries {
                for (i, bound) in HISTOGRAM_BUCKETS.iter().enumerate() {
                    let le = format!("le=\"{bound}\"");
                    let lbl = if labels.is_empty() {
                        le
                    } else {
                        format!("{labels},{le}")
                    };
                    out.push_str(&format!("{name}_bucket{{{lbl}}} {}\n", hist.buckets[i]));
                }
                let inf = if labels.is_empty() {
                    "le=\"+Inf\"".to_string()
                } else {
                    format!("{labels},le=\"+Inf\"")
                };
                out.push_str(&format!("{name}_bucket{{{inf}}} {}\n", hist.count));
                if labels.is_empty() {
                    out.push_str(&format!("{name}_sum {:.3}\n", hist.sum));
                    out.push_str(&format!("{name}_count {}\n", hist.count));
                } else {
                    out.push_str(&format!("{name}_sum{{{labels}}} {:.3}\n", hist.sum));
                    out.push_str(&format!("{name}_count{{{labels}}} {}\n", hist.count));
                }
            }
        }
        out
    }
}
