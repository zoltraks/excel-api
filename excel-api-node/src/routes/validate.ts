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
    const field = issue?.path?.[0];
    const message =
      issue && issue.code === 'invalid_type' && typeof field === 'string'
        ? `${field} is required`
        : `Invalid request body: ${issue ? `${issue.path.map(String).join('.')} ${issue.message}`.trim() : 'malformed'}`;
    invalidRequest(reply, message);
    return null;
  }
  return parsed.data;
}

export const CellWriteSchema = z
  .object({ value: z.unknown() })
  .refine((body) => Object.hasOwn(body, 'value'), { message: 'value is required' });

export const AddRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  after_row: z.number().int().optional(),
  copy_style_from: z.number().int().optional(),
});

export const UpdateRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export const RecordBatchSchema = z.object({
  operations: z
    .array(
      z.object({
        op: z.enum(['add', 'update', 'delete']),
        row_index: z.number().int().optional(),
        data: z.record(z.string(), z.unknown()).optional(),
        copy_style_from: z.number().int().optional(),
      }),
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
      }),
    )
    .nonempty(),
});
