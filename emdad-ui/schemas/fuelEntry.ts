//schemas/fuelEntry.ts
import { z } from "zod";
export const FuelEntrySchema = z.object({
  station_name: z.string().min(2),
  date: z.string().min(1),
  time: z.string().min(1),
  liters: z.coerce.number().positive(),
  total_price: z.coerce.number().positive(),
  price_per_liter: z.coerce.number().positive().optional(),
  odometer_reading: z.string().optional(),
  license_plate: z.string().optional(),
});
export type FuelEntryForm = z.infer<typeof FuelEntrySchema>;
