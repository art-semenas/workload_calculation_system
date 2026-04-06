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
  transportType: z.string().min(1),
  distanceKm: z.number().min(0),
  oneWayTimeMin: z.number().min(0),
})

export type Travel = z.infer<typeof TravelSchema>
export type TravelUpdate = z.infer<typeof TravelUpdateSchema>
