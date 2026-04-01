//lib/auth.ts
export const Auth = {
  getToken: () => (typeof window === "undefined" ? null : localStorage.getItem("mgr_token")),
  setToken: (t: string) => localStorage.setItem("mgr_token", t),
  clear: () => {
    localStorage.removeItem("mgr_token");
    localStorage.removeItem("mgr_email");
  },
};
