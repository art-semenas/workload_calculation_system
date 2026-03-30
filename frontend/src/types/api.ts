import { z } from 'zod'

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export const MetaSchema = z
  .object({
    page: z.number().optional(),
    total: z.number().optional(),
    per_page: z.number().optional(),
  })
  .nullable()

// Factory: ApiResponseSchema(z.object({...})) produces a typed response schema.
// Matches TOR §10 response envelope: { data, meta, error }
export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    meta: MetaSchema,
    error: ErrorSchema.nullable(),
  })
}

export type ApiError = z.infer<typeof ErrorSchema>
export type ApiMeta = z.infer<typeof MetaSchema>
export type ApiResponse<T> = {
  data: T | null
  meta: ApiMeta
  error: ApiError | null
}
