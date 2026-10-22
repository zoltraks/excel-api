import { describe, it, expect } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { buildRequestLogRecord } from './rotatingFileLogger.js';

const request = {
  method: 'GET',
  url: '/api/v1/workbooks',
  ip: '127.0.0.1',
} as unknown as FastifyRequest;

const reply = {
  statusCode: 200,
  elapsedTime: 45,
} as unknown as FastifyReply;

describe('buildRequestLogRecord', () => {
  const logData = buildRequestLogRecord(request, reply) as Record<string, never>;

  it('should use correct field names for JSON log format', () => {
    expect(logData).toHaveProperty('level');
    expect(logData).toHaveProperty('date');
    expect(logData).toHaveProperty('time');
    expect(logData).toHaveProperty('message');
    expect(logData).toHaveProperty('request');
    expect(logData).toHaveProperty('response');
    expect(logData).toHaveProperty('remote');

    // Verify one-word key names
    expect(logData).not.toHaveProperty('msg');
    expect(logData).not.toHaveProperty('req');
    expect(logData).not.toHaveProperty('res');
    expect(logData).not.toHaveProperty('remoteAddress');
    expect(logData).not.toHaveProperty('hostname');

    // Verify date format YYYY-MM-DD
    expect(logData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify time format hh:mm:ss.fff
    expect(logData.time).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it('should carry the request and response values', () => {
    expect(logData.level).toBe('info');
    expect(logData.message).toBe('Request completed');
    expect(logData.request).toMatchObject({ method: 'GET', url: '/api/v1/workbooks' });
    expect(logData.response).toMatchObject({ statusCode: 200, responseTime: 45 });
    expect(logData.remote).toBe('127.0.0.1');
  });
});
