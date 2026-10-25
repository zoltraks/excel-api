// Per-workbook serialized write queue with debounced batching.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use serde_json::Value;
use tokio::sync::{mpsc, oneshot};

use crate::cache::WorkbookCache;
use crate::config::SheetHeaderConfig;
use crate::lock::FileLock;

#[derive(Debug, Clone)]
pub enum OpVerb {
    Add,
    Update,
    Delete,
    Write,
    Clear,
}

#[derive(Debug)]
pub struct BatchOperation {
    /// "cell" or "record".
    pub kind: &'static str,
    pub verb: OpVerb,
    pub sheet_name: String,
    pub cell_ref: Option<String>,
    pub record_index: Option<u32>,
    pub after_row: Option<u32>,
    pub copy_style_from: Option<u32>,
    pub data: Value,
}

#[derive(Debug)]
pub struct OpResult {
    pub success: bool,
    pub data: Value,
    pub error: Option<String>,
    pub code: Option<String>,
}

impl OpResult {
    pub const fn ok(data: Value) -> Self {
        Self {
            success: true,
            data,
            error: None,
            code: None,
        }
    }
    pub fn err(error: String, code: &str) -> Self {
        Self {
            success: false,
            data: Value::Null,
            error: Some(error),
            code: Some(code.to_string()),
        }
    }
}

#[derive(Debug)]
pub enum EnqueueError {
    QueueFull,
    Locked(String),
    Internal(String),
}

pub struct LaneConfig {
    pub file_id: String,
    pub file_path: PathBuf,
    pub sheets: HashMap<String, SheetHeaderConfig>,
    pub lock: Arc<FileLock>,
    pub cache: Arc<WorkbookCache>,
}

struct PendingOp {
    op: BatchOperation,
    reply: oneshot::Sender<Result<OpResult, EnqueueError>>,
}

enum LaneMsg {
    Op(PendingOp),
    Shutdown,
}

struct Lane {
    tx: mpsc::Sender<LaneMsg>,
    depth: Arc<AtomicUsize>,
}

type BatchExecutor = Arc<
    dyn Fn(&LaneConfig, Vec<BatchOperation>) -> Result<Vec<OpResult>, EnqueueError> + Send + Sync,
>;

pub struct WriteQueue {
    lanes: Mutex<HashMap<String, Lane>>,
    max_size: usize,
    debounce: Duration,
    executor: BatchExecutor,
}

impl WriteQueue {
    pub fn new(max_size: usize, debounce_ms: u64, executor: BatchExecutor) -> Self {
        Self {
            lanes: Mutex::new(HashMap::new()),
            max_size,
            debounce: Duration::from_millis(debounce_ms),
            executor,
        }
    }

    fn lane(&self, cfg: &LaneConfig) -> Lane {
        let mut lanes = self
            .lanes
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some(lane) = lanes.get(&cfg.file_id) {
            return Lane {
                tx: lane.tx.clone(),
                depth: lane.depth.clone(),
            };
        }
        let (tx, rx) = mpsc::channel::<LaneMsg>(self.max_size + 16);
        let depth = Arc::new(AtomicUsize::new(0));
        let lane_cfg = LaneConfig {
            file_id: cfg.file_id.clone(),
            file_path: cfg.file_path.clone(),
            sheets: cfg
                .sheets
                .iter()
                .map(|(k, v)| {
                    (
                        k.clone(),
                        SheetHeaderConfig {
                            mode: v.mode.clone(),
                            identifier_row: v.identifier_row,
                            type_row: v.type_row,
                            description_row: v.description_row,
                            legend_sheet: v.legend_sheet.clone(),
                        },
                    )
                })
                .collect(),
            lock: cfg.lock.clone(),
            cache: cfg.cache.clone(),
        };
        let depth_task = depth.clone();
        let executor = self.executor.clone();
        let debounce = self.debounce;
        let max = self.max_size;
        tokio::spawn(async move {
            lane_loop(rx, lane_cfg, executor, debounce, max, depth_task).await;
        });
        let lane = Lane { tx, depth };
        lanes.insert(
            cfg.file_id.clone(),
            Lane {
                tx: lane.tx.clone(),
                depth: lane.depth.clone(),
            },
        );
        lane
    }

    pub fn enqueue(
        &self,
        cfg: &LaneConfig,
        op: BatchOperation,
    ) -> Result<oneshot::Receiver<Result<OpResult, EnqueueError>>, EnqueueError> {
        let lane = self.lane(cfg);
        if lane.depth.load(Ordering::SeqCst) >= self.max_size {
            return Err(EnqueueError::QueueFull);
        }
        let (reply_tx, reply_rx) = oneshot::channel();
        lane.tx
            .try_send(LaneMsg::Op(PendingOp {
                op,
                reply: reply_tx,
            }))
            .map_err(|_| EnqueueError::QueueFull)?;
        lane.depth.fetch_add(1, Ordering::SeqCst);
        Ok(reply_rx)
    }

    pub async fn enqueue_batch(
        &self,
        cfg: &LaneConfig,
        ops: Vec<BatchOperation>,
    ) -> Result<Vec<OpResult>, EnqueueError> {
        let mut receivers = Vec::with_capacity(ops.len());
        for op in ops {
            let rx = self.enqueue(cfg, op)?;
            receivers.push(rx);
        }
        let mut results = Vec::with_capacity(receivers.len());
        for rx in receivers {
            match rx.await {
                Ok(Ok(result)) => results.push(result),
                Ok(Err(e)) => return Err(e),
                Err(_) => {
                    return Err(EnqueueError::Internal("queue lane dropped".to_string()));
                }
            }
        }
        Ok(results)
    }

    /// Signal every lane to flush pending work and stop.
    pub async fn shutdown(&self) {
        let senders: Vec<mpsc::Sender<LaneMsg>> = {
            let lanes = self
                .lanes
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            lanes.values().map(|l| l.tx.clone()).collect()
        };
        for tx in senders {
            let _ = tx.send(LaneMsg::Shutdown).await;
        }
    }

    pub fn depth(&self, file_id: &str) -> usize {
        self.lanes
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .get(file_id)
            .map_or(0, |l| l.depth.load(Ordering::SeqCst))
    }
}

async fn lane_loop(
    mut rx: mpsc::Receiver<LaneMsg>,
    cfg: LaneConfig,
    executor: BatchExecutor,
    debounce: Duration,
    _max: usize,
    depth: Arc<AtomicUsize>,
) {
    let mut pending: Vec<PendingOp> = Vec::new();
    loop {
        tokio::select! {
            msg = rx.recv() => {
                match msg {
                    Some(LaneMsg::Op(p)) => pending.push(p),
                    Some(LaneMsg::Shutdown) | None => {
                        flush(&cfg, &executor, &mut pending, &depth).await;
                        return;
                    }
                }
            }
            () = tokio::time::sleep(debounce), if !pending.is_empty() => {
                flush(&cfg, &executor, &mut pending, &depth).await;
            }
        }
        if pending.len() >= _max {
            flush(&cfg, &executor, &mut pending, &depth).await;
        }
    }
}

async fn flush(
    cfg: &LaneConfig,
    executor: &BatchExecutor,
    pending: &mut Vec<PendingOp>,
    depth: &Arc<AtomicUsize>,
) {
    if pending.is_empty() {
        return;
    }
    let batch: Vec<PendingOp> = std::mem::take(pending);
    let count = batch.len();
    let (ops, replies): (Vec<_>, Vec<_>) = batch.into_iter().map(|p| (p.op, p.reply)).unzip();
    let cfg_path = cfg.file_path.clone();
    let cfg_id = cfg.file_id.clone();
    let cfg_lock = cfg.lock.clone();
    let cfg_cache = cfg.cache.clone();
    let cfg_sheets = clone_sheets(&cfg.sheets);
    let executor = executor.clone();
    let outcome = tokio::task::spawn_blocking(move || {
        let lane_cfg = LaneConfig {
            file_id: cfg_id,
            file_path: cfg_path,
            sheets: cfg_sheets,
            lock: cfg_lock,
            cache: cfg_cache,
        };
        executor(&lane_cfg, ops)
    })
    .await
    .unwrap_or_else(|e| Err(EnqueueError::Internal(format!("executor join: {e}"))));

    match outcome {
        Ok(results) => {
            for (reply, result) in replies.into_iter().zip(results) {
                let _ = reply.send(Ok(result));
            }
        }
        Err(e) => {
            for reply in replies {
                let _ = reply.send(Err(match &e {
                    EnqueueError::Locked(m) => EnqueueError::Locked(m.clone()),
                    EnqueueError::QueueFull => EnqueueError::QueueFull,
                    EnqueueError::Internal(m) => EnqueueError::Internal(m.clone()),
                }));
            }
        }
    }
    depth.fetch_sub(count, Ordering::SeqCst);
}

fn clone_sheets(sheets: &HashMap<String, SheetHeaderConfig>) -> HashMap<String, SheetHeaderConfig> {
    sheets
        .iter()
        .map(|(k, v)| {
            (
                k.clone(),
                SheetHeaderConfig {
                    mode: v.mode.clone(),
                    identifier_row: v.identifier_row,
                    type_row: v.type_row,
                    description_row: v.description_row,
                    legend_sheet: v.legend_sheet.clone(),
                },
            )
        })
        .collect()
}
