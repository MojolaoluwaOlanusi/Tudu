import { z } from 'zod';

/**
 * Zod schemas for the write endpoints.
 *
 * The tasks table allows NULL for description/category/priority/due_date,
 * and Postgres enforces the category/priority enums. Zod catches the same
 * constraints before the round trip, and .strict() rejects a stray field
 * so a caller cannot smuggle in a property we do not honour.
 */
export const CreateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    description: z.string().max(10_000).optional(),
    category: z.enum(['work', 'personal', 'study']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().datetime().optional(),
    board_id: z.string().uuid().optional(),
    column_id: z.string().uuid().optional(),
    naturalLanguage: z.boolean().optional(),
  })
  .strict();

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(10_000).nullable().optional(),
    category: z.enum(['work', 'personal', 'study']).nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
    due_date: z.string().datetime().nullable().optional(),
    status: z.enum(['todo', 'doing', 'done']).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

/** Turn a ZodError into the API's { error, fields } shape. */
export const zodError = (error: z.ZodError): { error: string; fields: Record<string, string> } => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    if (!fields[path]) fields[path] = issue.message;
  }
  return { error: 'Invalid request body', fields };
};
