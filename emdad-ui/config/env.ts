// congig/env.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
if (!API_BASE && typeof window === "undefined") {
  console.warn("[ENV] NEXT_PUBLIC_API_BASE is not set");
}
