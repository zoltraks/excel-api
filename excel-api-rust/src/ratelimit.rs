// Fixed-window per-key rate limiter (single-node).

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

struct Bucket {
    window_start: Instant,
    count: u32,
}

pub struct RateLimiter {
    buckets: Mutex<HashMap<String, Bucket>>,
    limit: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(limit: u32, window: Duration) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            limit,
            window,
        }
    }

    pub fn hit(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut buckets = self
            .buckets
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        match buckets.get_mut(key) {
            Some(b) if now.duration_since(b.window_start) < self.window => {
                b.count += 1;
                b.count <= self.limit
            }
            _ => {
                buckets.insert(
                    key.to_string(),
                    Bucket {
                        window_start: now,
                        count: 1,
                    },
                );
                if buckets.len() > 10_000 {
                    let window = self.window;
                    buckets.retain(|_, b| now.duration_since(b.window_start) < window);
                }
                true
            }
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
    use super::*;

    #[test]
    fn allows_up_to_limit() {
        let limiter = RateLimiter::new(2, Duration::from_secs(60));
        assert!(limiter.hit("k"));
        assert!(limiter.hit("k"));
        assert!(!limiter.hit("k"));
        assert!(limiter.hit("other"));
    }
}
