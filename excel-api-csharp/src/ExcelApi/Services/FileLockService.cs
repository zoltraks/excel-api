using System.Text.Json;

namespace BigBytes.ExcelApi.Services;

public class LockfileContent
{
    public int Pid { get; set; }
    public string Hostname { get; set; } = "";
    public string LockedAt { get; set; } = "";
    public string Implementation { get; set; } = "";
}

public class LockInfo
{
    public bool Locked { get; set; }
    public string? LockedBy { get; set; }
    public string? LockedSince { get; set; }
}

public class FileLockService
{
    private const int PollIntervalMs = 25;
    private const string Implementation = "excel-api-csharp";

    private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    private readonly string lockDir;
    private readonly int lockTimeoutMs;
    private readonly int pid;
    private readonly string hostname;

    public FileLockService(string lockDir, int lockTimeoutMs)
    {
        this.lockDir = lockDir;
        this.lockTimeoutMs = lockTimeoutMs;
        pid = Environment.ProcessId;
        hostname = Environment.MachineName;
        Directory.CreateDirectory(this.lockDir);
    }

    public async Task AcquireAsync(string fileId)
    {
        var lockfilePath = GetLockfilePath(fileId);
        var deadline = DateTime.UtcNow.AddMilliseconds(lockTimeoutMs);

        while (true)
        {
            var content = new LockfileContent
            {
                Pid = pid,
                Hostname = hostname,
                LockedAt = DateTime.UtcNow.ToString("o"),
                Implementation = Implementation
            };

            try
            {
                // Atomic exclusive create — throws IOException when the file exists
                using var stream = new FileStream(
                    lockfilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                await JsonSerializer.SerializeAsync(stream, content, JsonOptions);
                return;
            }
            catch (IOException)
            {
                // Lockfile exists — inspect below
            }
            catch (UnauthorizedAccessException)
            {
                // File exists but is not writable; treat as held
            }

            var existing = TryReadLockfile(lockfilePath);
            if (existing != null && IsStale(existing))
            {
                try
                {
                    File.Delete(lockfilePath);
                }
                catch (IOException)
                {
                    // Raced with another process; retry loop handles it
                }
                continue;
            }
            if (existing != null && existing.Pid == pid)
            {
                throw new InvalidOperationException(
                    $"File is locked by {existing.Hostname} (PID {existing.Pid})");
            }
            if (DateTime.UtcNow >= deadline)
            {
                var holder = existing != null
                    ? $"{existing.Hostname} (PID {existing.Pid})"
                    : "unknown holder";
                throw new InvalidOperationException($"File is locked by {holder}");
            }

            await Task.Delay(PollIntervalMs);
        }
    }

    public void Release(string fileId)
    {
        var lockfilePath = GetLockfilePath(fileId);
        var existing = TryReadLockfile(lockfilePath);
        if (existing != null && existing.Pid == pid)
        {
            try
            {
                File.Delete(lockfilePath);
            }
            catch (IOException)
            {
                // Best-effort release; stale expiry covers leftovers
            }
        }
    }

    public LockInfo GetLockInfo(string fileId)
    {
        var existing = TryReadLockfile(GetLockfilePath(fileId));
        if (existing == null || IsStale(existing))
        {
            return new LockInfo { Locked = false };
        }
        return new LockInfo
        {
            Locked = true,
            LockedBy = existing.Hostname,
            LockedSince = existing.LockedAt
        };
    }

    public string GetLockfilePath(string fileId)
    {
        return Path.Combine(lockDir, $"{fileId}.lock");
    }

    private bool IsStale(LockfileContent lockContent)
    {
        if (!DateTime.TryParse(lockContent.LockedAt, null,
                System.Globalization.DateTimeStyles.RoundtripKind, out var lockTime))
        {
            return false;
        }
        return DateTime.UtcNow - lockTime.ToUniversalTime() >= TimeSpan.FromMilliseconds(lockTimeoutMs);
    }

    private LockfileContent? TryReadLockfile(string lockfilePath)
    {
        try
        {
            if (!File.Exists(lockfilePath))
            {
                return null;
            }
            var content = File.ReadAllText(lockfilePath);
            var parsed = JsonSerializer.Deserialize<LockfileContent>(content, JsonOptions);
            if (parsed == null || parsed.Pid == 0 || string.IsNullOrEmpty(parsed.LockedAt))
            {
                return null;
            }
            return parsed;
        }
        catch (Exception)
        {
            return null;
        }
    }
}
