package pl.alyx.api.excel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.exception.FileLockedException;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * File locking service implementing the shared lockfile protocol.
 * Lockfiles live in the configured lock directory as "{fileId}.lock" with
 * JSON content {pid, hostname, locked_at, implementation}.
 */
@Service
public class FileLockService {

    private static final long POLL_INTERVAL_MS = 25L;
    private static final String IMPLEMENTATION = "excel-api-java";

    private final Path lockDir;
    private final long lockTimeoutMs;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final long pid;
    private final String hostname;

    public FileLockService(final WorkbookConfig workbookConfig) {
        String configuredDir = workbookConfig.getLockDir();
        this.lockDir = configuredDir == null || configuredDir.isEmpty()
                ? Paths.get("locks")
                : Paths.get(configuredDir);
        this.lockTimeoutMs = workbookConfig.getLockTimeoutMs();
        this.pid = ProcessHandle.current().pid();
        this.hostname = resolveHostname();
        try {
            Files.createDirectories(this.lockDir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create lock directory: " + this.lockDir, e);
        }
    }

    /**
     * Acquires the lock for the given workbook id, waiting for foreign locks
     * to be released until the configured lock timeout expires.
     * @param fileId the workbook id
     * @throws FileLockedException if the lock cannot be acquired in time
     */
    public void acquire(final String fileId) {
        Path lockfile = lockFilePath(fileId);
        long deadline = System.currentTimeMillis() + lockTimeoutMs;

        while (true) {
            Map<String, Object> content = new HashMap<>();
            content.put("pid", pid);
            content.put("hostname", hostname);
            content.put("locked_at", Instant.now().toString());
            content.put("implementation", IMPLEMENTATION);

            try {
                Files.writeString(lockfile, objectMapper.writeValueAsString(content),
                        StandardOpenOption.CREATE_NEW);
                return;
            } catch (FileAlreadyExistsException e) {
                // Lockfile exists — inspect below
            } catch (IOException e) {
                throw new IllegalStateException("Failed to create lockfile: " + lockfile, e);
            }

            JsonNode existing = tryReadLockfile(lockfile);
            if (existing != null && isStale(existing)) {
                try {
                    Files.deleteIfExists(lockfile);
                } catch (IOException e) {
                    // Raced with another process; retry loop handles it
                }
                continue;
            }
            if (existing != null && existing.path("pid").asLong() == pid) {
                throw new FileLockedException(
                        "File is locked by " + hostname + " (PID " + pid + ")");
            }
            if (System.currentTimeMillis() >= deadline) {
                throw new FileLockedException(holderDescription(existing));
            }

            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new FileLockedException("Interrupted while waiting for file lock");
            }
        }
    }

    /**
     * Releases the lock for the given workbook id if owned by this process.
     * @param fileId the workbook id
     */
    public void release(final String fileId) {
        Path lockfile = lockFilePath(fileId);
        JsonNode existing = tryReadLockfile(lockfile);
        if (existing != null && existing.path("pid").asLong() == pid) {
            try {
                Files.deleteIfExists(lockfile);
            } catch (IOException e) {
                // Best-effort release; stale expiry covers leftovers
            }
        }
    }

    /**
     * Checks whether the given workbook is currently locked by a live lock.
     * @param fileId the workbook id
     * @return true if a non-stale lockfile exists
     */
    public boolean isLocked(final String fileId) {
        JsonNode existing = tryReadLockfile(lockFilePath(fileId));
        return existing != null && !isStale(existing);
    }

    /**
     * Returns lock status details for the given workbook.
     * @param fileId the workbook id
     * @return map with locked, locked_by, locked_since fields
     */
    public Map<String, Object> getLockInfo(final String fileId) {
        Map<String, Object> info = new HashMap<>();
        JsonNode existing = tryReadLockfile(lockFilePath(fileId));
        if (existing == null || isStale(existing)) {
            info.put("locked", false);
            return info;
        }
        info.put("locked", true);
        info.put("locked_by", existing.path("hostname").asText(""));
        info.put("locked_since", existing.path("locked_at").asText(""));
        return info;
    }

    private Path lockFilePath(final String fileId) {
        return lockDir.resolve(fileId + ".lock");
    }

    private boolean isStale(final JsonNode lockContent) {
        String lockedAt = lockContent.path("locked_at").asText(null);
        if (lockedAt == null) {
            return false;
        }
        try {
            Instant lockTime = Instant.parse(lockedAt);
            return Instant.now().toEpochMilli() - lockTime.toEpochMilli() >= lockTimeoutMs;
        } catch (Exception e) {
            return false;
        }
    }

    private JsonNode tryReadLockfile(final Path lockfile) {
        try {
            if (!Files.exists(lockfile)) {
                return null;
            }
            JsonNode node = objectMapper.readTree(Files.readString(lockfile));
            if (node == null || !node.path("pid").isNumber() || !node.path("locked_at").isTextual()) {
                return null;
            }
            return node;
        } catch (IOException e) {
            return null;
        }
    }

    private String holderDescription(final JsonNode existing) {
        if (existing == null) {
            return "File is locked by unknown holder";
        }
        return "File is locked by " + existing.path("hostname").asText("unknown")
                + " (PID " + existing.path("pid").asLong() + ")";
    }

    private static String resolveHostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            String runtimeName = ManagementFactory.getRuntimeMXBean().getName();
            int at = runtimeName.indexOf('@');
            return at >= 0 ? runtimeName.substring(at + 1) : "unknown";
        }
    }
}
