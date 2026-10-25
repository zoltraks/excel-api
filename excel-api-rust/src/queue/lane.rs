// Lane execution: message loop, batch flush, and sheet cloning.

use super::*;

pub(super) async fn lane_loop(
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
