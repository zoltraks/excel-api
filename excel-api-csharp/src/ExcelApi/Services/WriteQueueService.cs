using System.Collections.Concurrent;

namespace BigBytes.ExcelApi.Services;

public class ServiceBusyException : Exception
{
    public ServiceBusyException(string message) : base(message)
    {
    }
}

/// <summary>
/// Per-workbook write queue: serializes write jobs per workbook id,
/// tracks pending depth for lock-status reporting, and rejects
/// submissions beyond the configured batch capacity.
/// </summary>
public class WriteQueueService
{
    private class WorkbookLane
    {
        public readonly SemaphoreSlim Gate = new SemaphoreSlim(1, 1);
        public int Depth;
    }

    private readonly ConcurrentDictionary<string, WorkbookLane> lanes = new();
    private readonly int batchMaxSize;

    public WriteQueueService(int batchMaxSize)
    {
        this.batchMaxSize = batchMaxSize;
    }

    /// <summary>
    /// Submits a write job for serialized execution against the given workbook.
    /// </summary>
    /// <exception cref="ServiceBusyException">Queue capacity reached</exception>
    public async Task<T> SubmitAsync<T>(string fileId, Func<Task<T>> job)
    {
        var lane = lanes.GetOrAdd(fileId, _ => new WorkbookLane());
        var depth = Interlocked.Increment(ref lane.Depth);
        if (depth > batchMaxSize)
        {
            Interlocked.Decrement(ref lane.Depth);
            throw new ServiceBusyException($"Write queue capacity reached for workbook '{fileId}'");
        }

        try
        {
            await lane.Gate.WaitAsync();
            try
            {
                return await job();
            }
            finally
            {
                lane.Gate.Release();
            }
        }
        finally
        {
            Interlocked.Decrement(ref lane.Depth);
        }
    }

    /// <summary>
    /// Returns the pending write depth for the given workbook
    /// (queued plus running jobs).
    /// </summary>
    public int GetDepth(string fileId)
    {
        return lanes.TryGetValue(fileId, out var lane) ? lane.Depth : 0;
    }
}
