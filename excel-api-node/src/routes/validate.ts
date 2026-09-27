// Request body validation — contract schemas enforced at the route boundary
// (400 INVALID_REQUEST in the contract error envelope).

import { z, type ZodType } from 'zod';
import type { FastifyReply } from 'fastify';
import { metrics } from '../metrics/collector.js';

export function invalidRequest(reply: FastifyReply, message: string): FastifyReply {
  metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INVALID_REQUEST' });
  return reply.status(400).send({ error: 'INVALID_REQUEST', message });
}

export function validate<T>(reply: FastifyReply, schema: ZodType<T>, body: unknown): T | null {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    invalidRequest(
      reply,
      `Invalid request body: ${issue ? `${issue.path.join('.')} ${issue.message}`.trim() : 'malformed'}`
    );
    return null;
  }
  return parsed.data;
}

export const CellWriteSchema = z
  .object({ value: z.unknown() })
  .refine((body) => Object.hasOwn(body, 'value'), { message: 'value is required' });

export const AddRecordSchema = z.object({
  data: z.record(z.unknown()),
  after_row: z.number().int().optional(),
  copy_style_from: z.number().int().optional(),
});

export const UpdateRecordSchema = z.object({
  data: z.record(z.unknown()),
});

export const RecordBatchSchema = z.object({
  operations: z
    .array(
      z.object({
        op: z.enum(['add', 'update', 'delete']),
        row_index: z.number().int().optional(),
        data: z.record(z.unknown()).optional(),
        copy_style_from: z.number().int().optional(),
      })
    )
    .nonempty(),
});

export const CellBatchSchema = z.object({
  operations: z
    .array(
      z.object({
        op: z.enum(['update', 'clear']),
        ref: z.string().min(1),
        value: z.unknown().optional(),
      })
    )
    .nonempty(),
});
