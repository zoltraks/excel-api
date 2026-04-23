// Write queue unit tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initWriteQueue, getWriteQueue, type BatchOperation, type BatchResult } from './writeQueue.js';

describe('Write Queue', () => {
  it('should initialize queue with batch size and debounce time', () => {
    const queue = initWriteQueue(10, 100);
    expect(queue).toBeDefined();
  });

  it('should return same queue instance on subsequent init calls', () => {
    const queue1 = initWriteQueue(10, 100);
    const queue2 = initWriteQueue(20, 200);
    expect(queue1).toBe(queue2);
  });

  it('should enqueue operation and execute via executor', async () => {
    const queue = initWriteQueue(10, 100);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const operation: BatchOperation = {
      type: 'cell',
      sheetName: 'Sheet1',
      cellRef: 'A1',
      data: 'test',
    };

    await queue.enqueue('wb1', operation, executor);
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(executor).toHaveBeenCalled();
  });

  it('should batch operations within debounce window', async () => {
    const queue = initWriteQueue(10, 100);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op1: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'test1' };
    const op2: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A2', data: 'test2' };
    
    const promise1 = queue.enqueue('wb1', op1, executor);
    const promise2 = queue.enqueue('wb1', op2, executor);
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 150));
    
    await Promise.all([promise1, promise2]);
    
    expect(executor).toHaveBeenCalled();
    const calledWith = executor.mock.calls[0][0];
    expect(calledWith).toHaveLength(2);
  });

  it('should execute immediately when batch size is reached', async () => {
    const queue = initWriteQueue(2, 1000);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op1: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'test1' };
    const op2: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A2', data: 'test2' };
    
    queue.enqueue('wb1', op1, executor);
    queue.enqueue('wb1', op2, executor);
    
    // Should execute immediately without waiting for debounce
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(executor).toHaveBeenCalled();
  });

  it('should handle different workbooks independently', async () => {
    const queue = initWriteQueue(10, 100);
    const executor1 = vi.fn().mockResolvedValue([{ success: true }]);
    const executor2 = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op1: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'test1' };
    const op2: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'test2' };
    
    queue.enqueue('wb1', op1, executor1);
    queue.enqueue('wb2', op2, executor2);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(executor1).toHaveBeenCalled();
    expect(executor2).toHaveBeenCalled();
  });

  it('should flush pending operations', async () => {
    const queue = initWriteQueue(10, 1000);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'test' };
    
    queue.enqueue('wb1', op, executor);
    await queue.flush('wb1');
    
    expect(executor).toHaveBeenCalled();
  });

  it('should handle executor errors', async () => {
    const queue = initWriteQueue(10, 100);
    const executor = vi.fn().mockRejectedValue(new Error('Executor failed'));
    
    const op: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'test' };
    
    await expect(queue.enqueue('wb1', op, executor)).rejects.toThrow('Executor failed');
  });

  it('should support record operations', async () => {
    const queue = initWriteQueue(10, 100);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op: BatchOperation = {
      type: 'record',
      sheetName: 'Sheet1',
      recordIndex: 0,
      data: { name: 'test' },
    };
    
    await queue.enqueue('wb1', op, executor);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(executor).toHaveBeenCalled();
    const calledWith = executor.mock.calls[0][0];
    expect(calledWith[0].type).toBe('record');
  });

  it('should support range operations', async () => {
    const queue = initWriteQueue(10, 100);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op: BatchOperation = {
      type: 'range',
      sheetName: 'Sheet1',
      rangeRef: 'A1:B10',
      data: [[1, 2], [3, 4]],
    };
    
    await queue.enqueue('wb1', op, executor);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(executor).toHaveBeenCalled();
    const calledWith = executor.mock.calls[0][0];
    expect(calledWith[0].type).toBe('range');
  });

  it('should maintain operation order within batch', async () => {
    const queue = initWriteQueue(10, 100);
    const executor = vi.fn().mockResolvedValue([{ success: true }]);
    
    const op1: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A1', data: 'first' };
    const op2: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A2', data: 'second' };
    const op3: BatchOperation = { type: 'cell', sheetName: 'Sheet1', cellRef: 'A3', data: 'third' };
    
    queue.enqueue('wb1', op1, executor);
    queue.enqueue('wb1', op2, executor);
    queue.enqueue('wb1', op3, executor);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const calledWith = executor.mock.calls[0][0];
    expect(calledWith[0].data).toBe('first');
    expect(calledWith[1].data).toBe('second');
    expect(calledWith[2].data).toBe('third');
  });
});
