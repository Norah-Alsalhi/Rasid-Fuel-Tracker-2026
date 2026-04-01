//types/api.d.ts
export type Driver = { id: number; name: string; employee_id: string; active: boolean };
export type FuelPhoto = { id: number; type?: "odometer"|"plate"|"receipt"|"other"; url: string };
export type FuelEntry = {
  id: number; driver_id: number; driver_name: string; employee_id: string;
  station_name: string; fill_datetime: string; liters: number; total_price: number;
  price_per_liter?: number|null; odometer_reading?: string|null; license_plate?: string|null;
  gps_lat?: number|null; gps_lng?: number|null; status: "pending"|"approved"|"rejected";
  notes?: string|null; photos: FuelPhoto[];
};
export type LoginResponse = { access_token: string; manager: { email: string; name?: string } };
