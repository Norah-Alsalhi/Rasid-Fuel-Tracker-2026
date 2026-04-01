//emdad-ui/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("mgr_token");
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export default api;
