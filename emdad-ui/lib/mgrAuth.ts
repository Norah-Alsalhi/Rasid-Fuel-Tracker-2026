export function getMgrToken(): string | null {
  if (typeof window === "undefined") return null;
  const ls = localStorage.getItem("mgr_token");
  if (ls && ls.trim()) return ls;
  const ss = sessionStorage.getItem("mgr_token");
  if (ss && ss.trim()) return ss;
  return null;
}

export function requireMgrAuthOrRedirect(router: { replace: (p: string) => void }) {
  const t = getMgrToken();
  if (!t) router.replace("/manager/login");
  return t;
}