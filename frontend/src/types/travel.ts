import { z } from 'zod'

export const TravelSchema = z.object({
  id: z.string().uuid().optional(),
  objectId: z.string().uuid(),
  transportType: z.string(),
  distanceKm: z.number(),
  oneWayTimeMin: z.number(),
  roundTripMin: z.number(),
})

export const TravelUpdateSchema = z.object({
  transportType: z.string().min(1, 'Required'),
  distanceKm: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
    z
      .number({ required_error: 'Enter a valid number', invalid_type_error: 'Enter a number' })
      .min(0, 'Must be ≥ 0')
  ),
  oneWayTimeMin: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
    z
      .number({ required_error: 'Enter a valid number', invalid_type_error: 'Enter a number' })
      .min(0, 'Must be ≥ 0')
  ),
})

export type Travel = z.infer<typeof TravelSchema>
export type TravelUpdate = z.infer<typeof TravelUpdateSchema>
