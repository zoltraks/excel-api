package pl.alyx.api.excel.service;

import org.springframework.stereotype.Service;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.exception.ServiceBusyException;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-workbook write queue: serializes write jobs per workbook id,
 * tracks pending depth for lock-status reporting, and rejects
 * submissions beyond the configured batch capacity.
 */
@Service
public class WriteQueueService {

    /**
     * A unit of write work serialized through the queue.
     * @param <T> the result type
     */
    @FunctionalInterface
    public interface WriteJob<T> {
        /**
         * Executes the write work under the workbook monitor.
         * @return the job result
         * @throws IOException if an I/O error occurs
         */
        T get() throws IOException;
    }

    private final int batchMaxSize;
    private final Map<String, Object> monitors = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> depths = new ConcurrentHashMap<>();

    public WriteQueueService(final WorkbookConfig workbookConfig) {
        this.batchMaxSize = workbookConfig.getBatchMaxSize();
    }

    /**
     * Submits a write job for serialized execution against the given workbook.
     * @param fileId the workbook id
     * @param job the write job
     * @param <T> the result type
     * @return the job result
     * @throws ServiceBusyException if the pending depth exceeds batch_max_size
     * @throws IOException if the job fails with an I/O error
     */
    public <T> T submit(final String fileId, final WriteJob<T> job) throws IOException {
        AtomicInteger depth = depths.computeIfAbsent(fileId, k -> new AtomicInteger());
        if (depth.incrementAndGet() > batchMaxSize) {
            depth.decrementAndGet();
            throw new ServiceBusyException(
                    "Write queue capacity reached for workbook '" + fileId + "'");
        }
        Object monitor = monitors.computeIfAbsent(fileId, k -> new Object());
        try {
            synchronized (monitor) {
                return job.get();
            }
        } finally {
            depth.decrementAndGet();
        }
    }

    /**
     * Returns the pending write depth for the given workbook
     * (queued plus running jobs).
     * @param fileId the workbook id
     * @return the number of queued or running write jobs
     */
    public int getDepth(final String fileId) {
        AtomicInteger depth = depths.get(fileId);
        return depth == null ? 0 : depth.get();
    }
}
