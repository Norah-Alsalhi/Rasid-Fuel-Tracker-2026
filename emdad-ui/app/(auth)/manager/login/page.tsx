"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type ApiErrorShape = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
};

type ApiTokenShape = {
  access_token?: unknown;
};

type Lang = "ar" | "en";
const LANG_STORAGE_KEY = "rasid_lang";

/* ================== ✅ Remember Me Storage Keys ================== */
const TOKEN_KEY = "mgr_token";
const REMEMBER_KEY = "mgr_remember";
const EMAIL_KEY = "mgr_email";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function pickErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data !== "object") return fallback;
  const obj = data as ApiErrorShape;
  const detail = obj.detail ?? obj.message ?? obj.error;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function getAccessToken(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const token = (data as ApiTokenShape).access_token;
  return typeof token === "string" && token.trim() ? token : undefined;
}

/* ================== ✅ Token helpers ================== */
function saveToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const ls = localStorage.getItem(TOKEN_KEY);
  if (ls && ls.trim()) return ls;

  const ss = sessionStorage.getItem(TOKEN_KEY);
  if (ss && ss.trim()) return ss;

  return null;
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function persistRememberPrefs(remember: boolean, email?: string) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    if (email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {
    // ignore
  }
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const apply = () => setReduce(Boolean(mq?.matches));
    apply();

    if (!mq) return;

    if ("addEventListener" in mq) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      // Legacy Safari
      // @ts-expect-error legacy
      mq.addListener(apply);
      // @ts-expect-error legacy
      return () => mq.removeListener(apply);
    }
  }, []);

  return reduce;
}

function AnimatedGlowOverlay({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const anim = el.animate(
      [
        { transform: "translate3d(-1.5%, -1.5%, 0) scale(1.02)", opacity: 0.55 },
        { transform: "translate3d(1.5%, 1.5%, 0) scale(1.03)", opacity: 0.7 },
      ],
      { duration: 14000, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }
    );

    return () => anim.cancel();
  }, [enabled]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(900px 560px at 18% 22%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(900px 560px at 82% 72%, rgba(59,130,246,0.16), transparent 60%)",
        opacity: 0.65,
      }}
      aria-hidden="true"
    />
  );
}

function pickInitialLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === "en" || saved === "ar") return saved;
  return "ar";
}

/* ================== Icons ================== */

function EyeOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      style={{
        fillRule: "evenodd",
        clipRule: "evenodd",
        strokeLinejoin: "round",
        strokeMiterlimit: 2,
      }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M5.112,18.784l-2.153,2.156c-0.585,0.586 -0.585,1.536 0.001,2.121c0.586,0.585 1.536,0.585 2.121,-0.001l2.666,-2.668c1.898,0.983 4.19,1.806 6.773,2.041l0,3.567c0,0.828 0.672,1.5 1.5,1.5c0.828,-0 1.5,-0.672 1.5,-1.5l0,-3.571c2.147,-0.201 4.091,-0.806 5.774,-1.571l3.199,3.202c0.585,0.586 1.535,0.586 2.121,0.001c0.586,-0.585 0.586,-1.535 0.001,-2.121l-2.579,-2.581c2.59,-1.665 4.091,-3.369 4.091,-3.369c0.546,-0.622 0.485,-1.57 -0.137,-2.117c-0.622,-0.546 -1.57,-0.485 -2.117,0.137c0,-0 -4.814,5.49 -11.873,5.49c-7.059,0 -11.873,-5.49 -11.873,-5.49c-0.547,-0.622 -1.495,-0.683 -2.117,-0.137c-0.622,0.547 -0.683,1.495 -0.137,2.117c0,0 1.175,1.334 3.239,2.794Z" />
    </svg>
  );
}

function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DashboardIcon({
  size = 40,
  blueClassName = "text-sky-700",
  purpleClassName = "text-purple-600",
}: {
  size?: number;
  blueClassName?: string;
  purpleClassName?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 504.123 504.123"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <g className={purpleClassName}>
        <polygon
          fill="currentColor"
          opacity="0.95"
          points="233.472,504.123 288.122,504.123 384.874,336.526 288.122,168.913 233.48,168.913 330.232,336.526"
        />
        <polyline
          fill="currentColor"
          opacity="0.72"
          points="330.232,336.526 233.472,504.123 288.122,504.123 384.874,336.526"
        />
        <polyline
          fill="currentColor"
          opacity="0.55"
          points="233.472,504.123 288.122,504.123 384.874,336.526"
        />
      </g>

      <g className={blueClassName}>
        <polygon
          fill="currentColor"
          opacity="0.95"
          points="216.001,335.218 270.659,335.21 173.891,167.613 270.659,0 216.001,0 119.249,167.613"
        />
        <polyline
          fill="currentColor"
          opacity="0.72"
          points="119.249,167.613 216.001,335.218 270.659,335.21 173.891,167.613"
        />
        <polyline
          fill="currentColor"
          opacity="0.55"
          points="119.249,167.613 216.001,335.218 270.659,335.21"
        />
      </g>
    </svg>
  );
}

type ToastKind = "success" | "error";
type ToastState = { open: boolean; kind: ToastKind; message: string };

export default function ManagerLoginPage() {
  const router = useRouter();

  const [lang, setLang] = useState<Lang>(() => pickInitialLang());

  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const t = useMemo(() => {
    if (isAr) {
      return {
        brand: "راصد",
        subtitle: "أهلًا بك مجددًا، سجّل دخولك للمنصة للوصول إلى تقارير راصد.",
        emailLabel: "البريد الإلكتروني",
        passLabel: "كلمة المرور",
        forgot: "نسيت كلمة المرور؟",
        remember: "تذكرني",
        submit: "تسجيل الدخول",
        busy: "جارٍ التنفيذ...",
        footer: "منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
        newUser: "مستخدم جديد؟ ",
        signup: "إنشاء حساب",
        requiredEmail: "البريد الإلكتروني مطلوب",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة",
        requiredPass: "كلمة المرور مطلوبة",
        loginFailed: (status: number) => `فشل تسجيل الدخول (${status})`,
        tokenMissing: "لم يتم استلام التوكن من السيرفر",
        unexpected: "حدث خطأ غير متوقع",
        toastLoginSuccess: "تم تسجيل الدخول بنجاح",
        toastLoginFailed: "تعذر تسجيل الدخول",
        showPassword: "إظهار كلمة المرور",
        hidePassword: "إخفاء كلمة المرور",
        checkingSession: "جارٍ التحقق...",
      };
    }

    return {
      brand: "Rasid",
      subtitle: "Welcome back! Pick up right where you left off.",
      emailLabel: "Email",
      passLabel: "Password",
      forgot: "Forgot password?",
      remember: "Remember me",
      submit: "Sign in",
      busy: "Signing in...",
      footer: "Rasid System",
      newUser: "New user?",
      signup: "Create account",
      requiredEmail: "Email is required",
      invalidEmail: "Invalid email format",
      requiredPass: "Password is required",
      loginFailed: (status: number) => `Login failed (${status})`,
      tokenMissing: "Token was not returned from server",
      unexpected: "Unexpected error",
      toastLoginSuccess: "Login successful",
      toastLoginFailed: "Login failed",
      showPassword: "Show password",
      hidePassword: "Hide password",
      checkingSession: "Checking session...",
    };
  }, [isAr]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const [busy, setBusy] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const reduceMotion = usePrefersReducedMotion();

  const [toast, setToast] = useState<ToastState>({
    open: false,
    kind: "success",
    message: "",
  });

  const toastTimerRef = useRef<number | null>(null);

  function showToast(kind: ToastKind, message: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ open: true, kind, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((p) => ({ ...p, open: false }));
      toastTimerRef.current = null;
    }, 2500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    if (serverError) setServerError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password, lang]);

  /* ================== ✅ Load Remember prefs + email on first mount ================== */
  useEffect(() => {
    try {
      const r = localStorage.getItem(REMEMBER_KEY);
      if (r === "0") setRemember(false);
      if (r === "1") setRemember(true);

      const savedEmail = localStorage.getItem(EMAIL_KEY);
      if (savedEmail) setEmail(savedEmail);
    } catch {
      // ignore
    }
  }, []);

  /* ================== ✅ Real token check on mount (Remember me) ================== */
  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setCheckingToken(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/manager/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.ok) {
          router.replace("/dashboard");
          return;
        }

        clearStoredToken();
      } catch {
        // backend off / network error -> stay on login
      } finally {
        setCheckingToken(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================== ✅ Email domain suggestions ================== */
  const EMAIL_DOMAINS = useMemo(
    () => [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "aol.com",
      "proton.me",
      "protonmail.com",
      "live.com",
    ],
    []
  );

  const [emailSugOpen, setEmailSugOpen] = useState(false);
  const [emailSugActive, setEmailSugActive] = useState(0);
  const emailWrapRef = useRef<HTMLDivElement | null>(null);

  const emailSuggestions = useMemo(() => {
    const v = email.trim();
    const at = v.indexOf("@");
    if (at <= 0) return [];

    const typedDomain = v.slice(at + 1).toLowerCase();

    if (v.includes(" ") || v.split("@").length > 2) return [];

    const list = EMAIL_DOMAINS.filter((d) => d.startsWith(typedDomain));

    return list.length ? list : typedDomain ? [] : EMAIL_DOMAINS;
  }, [email, EMAIL_DOMAINS]);

  function applyEmailDomain(domain: string) {
    const v = email.trim();
    const at = v.indexOf("@");
    if (at <= 0) return;

    const next = v.slice(0, at + 1) + domain;

    setEmail(next);
    setEmailSugOpen(false);
    setEmailSugActive(0);

    // مسح/تحديث خطأ الإيميل
    if (!next.trim()) {
      setFieldErrors((p) => ({ ...p, email: t.requiredEmail }));
    } else if (!isValidEmail(next)) {
      setFieldErrors((p) => ({ ...p, email: t.invalidEmail }));
    } else {
      setFieldErrors((p) => {
        const n = { ...p };
        delete n.email;
        return n;
      });
    }
  }

  /* ================== ✅ Validate function (FIX) ================== */
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = t.requiredEmail;
    else if (!isValidEmail(email)) errs.email = t.invalidEmail;
    if (!password) errs.password = t.requiredPass;
    return errs;
  }

  const canSubmit = useMemo(() => {
    const e = validate();
    return Object.keys(e).length === 0 && !busy && !checkingToken;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password, busy, lang, checkingToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      showToast("error", t.toastLoginFailed);
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/manager/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(email),
          password,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        const msg = pickErrorMessage(data, t.loginFailed(res.status));
        showToast("error", msg);
        throw new Error(msg);
      }

      const token = getAccessToken(data);
      if (!token) {
        showToast("error", t.tokenMissing);
        throw new Error(t.tokenMissing);
      }

      saveToken(token, remember);
      persistRememberPrefs(remember, normalizeEmail(email));

      showToast("success", t.toastLoginSuccess);

      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.unexpected;
      setServerError(msg);
      showToast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir={dir}
      className={[
        "min-h-screen flex items-center justify-center p-5",
        "relative overflow-hidden",
        "bg-[radial-gradient(1200px_640px_at_50%_8%,rgba(56,189,248,0.20),transparent_58%),radial-gradient(900px_520px_at_12%_92%,rgba(14,165,233,0.14),transparent_55%),radial-gradient(900px_520px_at_88%_86%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(to_bottom,#f9fcff,#edf6ff)]",
      ].join(" ")}
    >
      <AnimatedGlowOverlay enabled={!reduceMotion} />

      {/* ✅ Session check overlay */}
      {checkingToken ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-800 backdrop-blur">
            {t.checkingSession}
          </div>
        </div>
      ) : null}

      {toast.open ? (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl",
              toast.kind === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                : "border-red-200 bg-red-50/80 text-red-900",
              isAr ? "text-right" : "text-left",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className="fixed top-6 right-8 z-50 select-none">
        <div className="flex items-center gap-3 text-sm sm:text-base font-semibold">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={[
              "transition-none",
              lang === "en" ? "text-purple-600" : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
            aria-pressed={lang === "en"}
          >
            EN
          </button>

          <span className="text-slate-400 font-normal">|</span>

          <button
            type="button"
            onClick={() => setLang("ar")}
            className={[
              "transition-none",
              lang === "ar" ? "text-purple-600" : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
            aria-pressed={lang === "ar"}
          >
            AR
          </button>
        </div>
      </div>

      <div className="w-full max-w-[760px] relative">
        <div className="rounded-[36px] border border-slate-200/70 bg-white/25 backdrop-blur-xl overflow-hidden">
          <div className="relative px-10 pt-10 pb-7 text-center">
            <div className="inline-flex items-center justify-center gap-3 select-none">
              <DashboardIcon size={40} blueClassName="text-sky-700" purpleClassName="text-purple-600" />

              <span
                className="
                  text-4xl sm:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800
                  bg-clip-text text-transparent
                "
              >
                {t.brand}
              </span>
            </div>

            <p className="mt-5 text-sm sm:text-base text-slate-700">{t.subtitle}</p>
          </div>

          <div className="px-10 pb-10">
            {serverError ? (
              <div
                className={[
                  "mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
                  isAr ? "text-right" : "text-left",
                ].join(" ")}
              >
                {serverError}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-5">
              {/* ================== ✅ Email (with domain suggestions) ================== */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.emailLabel}</label>

                <div ref={emailWrapRef} className="relative">
                  <input
                    className={[
                      "w-full rounded-2xl border bg-white/90 px-5 py-4 text-sm text-slate-950 outline-none focus:ring-4",
                      fieldErrors.email
                        ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                        : "border-slate-200 focus:ring-purple-200 focus:border-purple-500",
                    ].join(" ")}
                    value={email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmail(v);

                      const trimmed = v.trim();
                      const at = trimmed.indexOf("@");
                      const canSuggest =
                        at > 0 && !trimmed.includes(" ") && trimmed.split("@").length === 2;

                      setEmailSugOpen(canSuggest);
                      setEmailSugActive(0);

                      if (!v.trim()) setFieldErrors((p) => ({ ...p, email: t.requiredEmail }));
                      else if (!isValidEmail(v)) setFieldErrors((p) => ({ ...p, email: t.invalidEmail }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.email;
                          return n;
                        });
                    }}
                    onFocus={() => {
                      const trimmed = email.trim();
                      const at = trimmed.indexOf("@");
                      const canSuggest =
                        at > 0 && !trimmed.includes(" ") && trimmed.split("@").length === 2;
                      if (canSuggest) setEmailSugOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (!emailSugOpen || emailSuggestions.length === 0) return;

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setEmailSugActive((i) => (i + 1) % emailSuggestions.length);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setEmailSugActive((i) => (i - 1 + emailSuggestions.length) % emailSuggestions.length);
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        applyEmailDomain(emailSuggestions[emailSugActive]);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setEmailSugOpen(false);
                      }
                    }}
                    placeholder="name@company.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-autocomplete="list"
                    aria-expanded={emailSugOpen}
                  />

                  {emailSugOpen && emailSuggestions.length > 0 ? (
                    <div
                      className={[
                        "absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg",
                        isAr ? "right-0" : "left-0",
                      ].join(" ")}
                      role="listbox"
                    >
                      <div className="max-h-[220px] overflow-auto py-2">
                        {emailSuggestions.map((d, idx) => {
                          const at = email.trim().indexOf("@");
                          const left = at >= 0 ? email.trim().slice(0, at + 1) : "";
                          const isActive = idx === emailSugActive;

                          return (
                            <button
                              key={d}
                              type="button"
                              onMouseEnter={() => setEmailSugActive(idx)}
                              onMouseDown={(ev) => ev.preventDefault()} // يمنع blur قبل الاختيار
                              onClick={() => applyEmailDomain(d)}
                              className={[
                                "w-full px-4 py-3 text-sm",
                                "flex items-center justify-between",
                                isActive
                                  ? "bg-slate-100 text-slate-950"
                                  : "bg-transparent text-slate-700 hover:bg-slate-50",
                                isAr ? "text-right" : "text-left",
                              ].join(" ")}
                              role="option"
                              aria-selected={isActive}
                            >
                              <span className="truncate">
                                {left}
                                {d}
                              </span>
                              <span className="text-xs text-slate-500">{isActive ? "↵" : ""}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {fieldErrors.email ? <div className="mt-2 text-xs text-red-700">{fieldErrors.email}</div> : null}
              </div>

              {/* ================== Password ================== */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.passLabel}</label>

                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className={[
                      "h-[56px] w-[72px] shrink-0",
                      "rounded-2xl border border-slate-200 bg-white/90",
                      "flex items-center justify-center",
                      "text-slate-600 hover:text-slate-900 hover:bg-white",
                      "outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500",
                    ].join(" ")}
                    aria-label={showPass ? t.hidePassword : t.showPassword}
                    title={showPass ? t.hidePassword : t.showPassword}
                  >
                    {showPass ? <EyeIcon size={23} /> : <EyeOffIcon size={23} />}
                  </button>

                  <input
                    className={[
                      "h-[56px] w-full min-w-0",
                      "rounded-2xl border bg-white/90 px-5",
                      "text-sm text-slate-950 outline-none focus:ring-4",
                      fieldErrors.password
                        ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                        : "border-slate-200 focus:ring-purple-200 focus:border-purple-300",
                    ].join(" ")}
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPassword(v);

                      if (!v) setFieldErrors((p) => ({ ...p, password: t.requiredPass }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.password;
                          return n;
                        });
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                {fieldErrors.password ? <div className="mt-2 text-xs text-red-700">{fieldErrors.password}</div> : null}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Link className="text-sm text-sky-900 hover:text-sky-950" href="/manager/forgot-password">
                  {t.forgot}
                </Link>

                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setRemember(next);
                      persistRememberPrefs(next, normalizeEmail(email || ""));
                    }}
                    className="h-4 w-4 accent-purple-600 focus:ring-4 focus:ring-purple-200"
                  />
                  {t.remember}
                </label>
              </div>

              <button
                disabled={!canSubmit}
                className={[
                  "w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white",
                  "bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800",
                  "hover:brightness-105",
                  "shadow-[0_14px_34px_rgba(2,132,199,0.30)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
                type="submit"
              >
                {busy || checkingToken ? t.busy : t.submit}
              </button>

              <div className="pt-2 text-xs text-slate-700 text-center">{t.footer}</div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center text-sm sm:text-base text-slate-700">
          <span className="mr-1">{t.newUser}</span>

          <Link
            href="/manager/signup"
            className="
              font-semibold
              text-sky-700
              hover:text-purple-600
              underline underline-offset-4
              transition-colors
            "
          >
            {t.signup}
          </Link>
        </div>
      </div>
    </div>
  );
}
