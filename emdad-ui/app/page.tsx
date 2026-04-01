"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const API_BASE  = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "mgr_token"; // must match what (manager)/dashboard reads

type Lang = "ar" | "en";
type Tab = "login" | "register";
const LANG_STORAGE_KEY = "rasid_lang";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
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

// Always return "ar" on both server and client for consistent hydration.
// We read localStorage only after mount inside useEffect.
function pickInitialLang(): Lang {
  return "ar";
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

function DashboardIcon({
  size = 44,
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
        <polyline fill="currentColor" opacity="0.72" points="330.232,336.526 233.472,504.123 288.122,504.123 384.874,336.526" />
        <polyline fill="currentColor" opacity="0.55" points="233.472,504.123 288.122,504.123 384.874,336.526" />
      </g>
      <g className={blueClassName}>
        <polygon
          fill="currentColor"
          opacity="0.95"
          points="216.001,335.218 270.659,335.21 173.891,167.613 270.659,0 216.001,0 119.249,167.613"
        />
        <polyline fill="currentColor" opacity="0.72" points="119.249,167.613 216.001,335.218 270.659,335.21 173.891,167.613" />
        <polyline fill="currentColor" opacity="0.55" points="119.249,167.613 216.001,335.218 270.659,335.21" />
      </g>
    </svg>
  );
}

function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

type ToastKind = "success" | "error";
type ToastState = { open: boolean; kind: ToastKind; message: string };

export default function ManagerAuthPage() {
  // ── All hooks first (Rules of Hooks) ──
  const [lang, setLang] = useState<Lang>("ar"); // "ar" on SSR = no hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPass, setLoginShowPass] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginGlobalErr, setLoginGlobalErr] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regShowPass, setRegShowPass] = useState(false);
  const [regShowConfirm, setRegShowConfirm] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regGlobalErr, setRegGlobalErr] = useState("");

  const reduceMotion = usePrefersReducedMotion();

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", message: "" });
  const toastTimerRef = useRef<number | null>(null);

  // Read localStorage lang after mount
  useEffect(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "ar") setLang(saved);
    setMounted(true);
  }, []);

  // Persist lang choice
  useEffect(() => { try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {} }, [lang]);

  // Toast cleanup
  useEffect(() => {
    return () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); };
  }, []);

  // ── Derived values (no hooks below) ──
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const t = useMemo(() => {
    if (isAr) {
      return {
        brand: "راصد",
        tabLogin: "تسجيل الدخول",
        tabRegister: "إنشاء حساب",
        loginSubtitle: "أهلًا بك مجددًا، سجّل دخولك للمنصة للوصول الى تحليل منصة راصد.",
        emailLabel: "البريد الإلكتروني",
        passwordLabel: "كلمة المرور",
        showPassword: "إظهار",
        hidePassword: "إخفاء",
        forgotPassword: "نسيت كلمة المرور؟",
        loginSubmit: "دخول",
        loginBusy: "جارٍ التحقق...",
        regSubtitle: "يسعدنا إنضمامن إلينا، أنشئ حسابك الآن وأبدأ باستكشاف منصة راصد.",
        nameLabel: "الاسم الكامل",
        namePlaceholder: "أدخل اسمك الكامل",
        confirmLabel: "تأكيد كلمة المرور",
        regSubmit: "إنشاء الحساب",
        regBusy: "جارٍ الإنشاء...",
        requiredField: "هذا الحقل مطلوب",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة",
        weakPassword: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        passwordMismatch: "كلمتا المرور غير متطابقتين",
        loginErrInvalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        loginErrServer: "خطأ في الاتصال بالخادم، حاول مجدداً",
        regErrExists: "هذا البريد الإلكتروني مسجّل مسبقاً",
        regErrServer: "خطأ في الاتصال بالخادم، حاول مجدداً",
        regSuccess: "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.",
        driverQuestion: "هل أنت سائق؟",
        driverLink: "سجّل دخولك من هنا",
        footer: "منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
      };
    }
    return {
      brand: "Rasid",
      tabLogin: "Login",
      tabRegister: "Register",
      loginTitle: "",
      loginSubtitle: "Welcome back. Sign in to view your Rased analytics and reports.",
      emailLabel: "Email",
      passwordLabel: "Password",
      showPassword: "Show",
      hidePassword: "Hide",
      forgotPassword: "Forgot password?",
      loginSubmit: "Sign in",
      loginBusy: "Signing in...",
      regTitle: "",
      regSubtitle: "We’re excited to have you! Create your account now and start exploring the Rased platform.",
      nameLabel: "Full name",
      namePlaceholder: "Enter your full name",
      confirmLabel: "Confirm password",
      regSubmit: "Create account",
      regBusy: "Creating...",
      requiredField: "This field is required",
      invalidEmail: "Invalid email format",
      weakPassword: "Password must be at least 8 characters",
      passwordMismatch: "Passwords do not match",
      loginErrInvalid: "Invalid email or password",
      loginErrServer: "Server error, please try again",
      regErrExists: "This email is already registered",
      regErrServer: "Server error, please try again",
      regSuccess: "Account created! You can now sign in.",
      driverQuestion: "Are you a driver?",
      driverLink: "Sign in here",
      footer: "Rasid Fleet & Fuel Management",
    };
  }, [isAr]);

  const loginCanSubmit = useMemo(() => {
    const em = normalizeEmail(loginEmail);
    return Boolean(em) && isValidEmail(em) && loginPassword.length > 0 && !loginBusy;
  }, [loginEmail, loginPassword, loginBusy]);

  const regCanSubmit = useMemo(() => {
    return (
      regName.trim().length > 0 &&
      isValidEmail(regEmail) &&
      regPassword.length >= 8 &&
      regConfirm === regPassword &&
      !regBusy
    );
  }, [regName, regEmail, regPassword, regConfirm, regBusy]);

  // ── Guard: don't paint until mounted (avoids hydration mismatch flash) ──
  if (!mounted) return null;

  // ── Helpers ──
  function showToast(kind: ToastKind, message: string) {
    if (toastTimerRef.current) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
    setToast({ open: true, kind, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((p) => ({ ...p, open: false }));
      toastTimerRef.current = null;
    }, 3000);
  }

  function validateLogin(): boolean {
    const e: Record<string, string> = {};
    if (!normalizeEmail(loginEmail)) e.email = t.requiredField;
    else if (!isValidEmail(loginEmail)) e.email = t.invalidEmail;
    if (!loginPassword) e.password = t.requiredField;
    setLoginErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onLoginSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateLogin()) return;
    setLoginBusy(true);
    setLoginGlobalErr("");
    try {
      const res = await fetch(`${API_BASE}/api/manager/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(loginEmail), password: loginPassword }),
      });
      const data = await readJsonSafe(res) as Record<string, unknown>;
      if (!res.ok) {
        const msg = (data?.detail as string) || (data?.message as string) || t.loginErrInvalid;
        setLoginGlobalErr(msg);
        return;
      }
      // Save token (key must match dashboard's getToken())
      const token = (data.access_token ?? data.token) as string | undefined;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      window.location.replace("/dashboard");
    } catch {
      setLoginGlobalErr(t.loginErrServer);
    } finally {
      setLoginBusy(false);
    }
  }

  function validateRegister(): boolean {
    const e: Record<string, string> = {};
    if (!regName.trim()) e.name = t.requiredField;
    if (!normalizeEmail(regEmail)) e.email = t.requiredField;
    else if (!isValidEmail(regEmail)) e.email = t.invalidEmail;
    if (!regPassword) e.password = t.requiredField;
    else if (regPassword.length < 8) e.password = t.weakPassword;
    if (!regConfirm) e.confirm = t.requiredField;
    else if (regConfirm !== regPassword) e.confirm = t.passwordMismatch;
    setRegErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onRegisterSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateRegister()) return;
    setRegBusy(true);
    setRegGlobalErr("");
    try {
      const res = await fetch(`${API_BASE}/api/manager/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName.trim(), email: normalizeEmail(regEmail), password: regPassword }),
      });
      const data = await readJsonSafe(res) as Record<string, unknown>;
      if (!res.ok) {
        const msg = (data?.detail as string) || t.regErrServer;
        const isExists = res.status === 409 || msg.toLowerCase().includes("exist");
        setRegGlobalErr(isExists ? t.regErrExists : msg);
        return;
      }
      showToast("success", t.regSuccess);
      setRegName(""); setRegEmail(""); setRegPassword(""); setRegConfirm("");
      setRegErrors({});
      setTimeout(() => setTab("login"), 1500);
    } catch {
      setRegGlobalErr(t.regErrServer);
    } finally {
      setRegBusy(false);
    }
  }

  // Shared input classes
  const inp = "w-full rounded-2xl border bg-white/90 px-5 py-4 text-sm text-slate-950 outline-none focus:ring-4";
  const ok = "border-slate-200 focus:ring-purple-200 focus:border-purple-500";
  const errInp = "border-red-300 focus:ring-red-100 focus:border-red-400";
  const eCls = `mt-2 px-1 text-xs font-medium text-red-700 ${isAr ? "text-right" : "text-left"}`;
  const labelCls = `block text-sm font-semibold text-slate-800 mb-2 ${isAr ? "text-right" : "text-left"}`;

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

      {/* Toast */}
      {toast.open && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <div
            className={[
              "rounded-2xl border px-5 py-3 text-sm backdrop-blur-xl shadow-lg",
              toast.kind === "success"
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                : "border-red-200 bg-red-50/90 text-red-900",
              isAr ? "text-right" : "text-left",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Language Switcher */}
      <div className="fixed top-6 right-8 z-50 select-none">
        <div className="flex items-center gap-3 text-sm sm:text-base font-semibold">
          <button type="button" onClick={() => setLang("en")} className={lang === "en" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"} aria-pressed={lang === "en"}>EN</button>
          <span className="text-slate-400 font-normal">|</span>
          <button type="button" onClick={() => setLang("ar")} className={lang === "ar" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"} aria-pressed={lang === "ar"}>AR</button>
        </div>
      </div>

      <div className="w-full max-w-[760px] relative">
        {/* Card */}
        <div className="rounded-[36px] border border-slate-200/70 bg-white/25 backdrop-blur-xl overflow-hidden">

          {/* Header – Logo + Title (above tabs) */}
          <div className="px-10 pt-10 pb-5 text-center">
            <div className="inline-flex items-center justify-center gap-3 select-none">
              <DashboardIcon size={40} blueClassName="text-sky-700" purpleClassName="text-purple-600" />
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800 bg-clip-text text-transparent">
                {t.brand}
              </span>
            </div>
            {/* Dynamic title & subtitle – shown above the tab switcher */}
            <div className="mt-5">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {tab === "login" ? t.loginTitle : t.regTitle}
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                {tab === "login" ? t.loginSubtitle : t.regSubtitle}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="px-10 pb-2">
            <div className="relative flex rounded-2xl bg-slate-100/70 border border-slate-200/60 p-1">
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm border border-slate-200/80 transition-all duration-300"
                style={{ [isAr ? "right" : "left"]: tab === "login" ? "4px" : "calc(50%)" }}
              />
              <button
                type="button"
                onClick={() => setTab("login")}
                className={[
                  "relative z-10 flex-1 py-3 text-sm font-semibold rounded-xl transition-colors duration-200",
                  tab === "login" ? "text-slate-900" : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {t.tabLogin}
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={[
                  "relative z-10 flex-1 py-3 text-sm font-semibold rounded-xl transition-colors duration-200",
                  tab === "register" ? "text-slate-900" : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {t.tabRegister}
              </button>
            </div>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === "login" && (
            <div className="px-10 pt-5 pb-10">
              {loginGlobalErr && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 text-center">
                  {loginGlobalErr}
                </div>
              )}
              <form onSubmit={onLoginSubmit} noValidate className="space-y-5">
                {/* Email */}
                <div>
                  <label className={labelCls}>{t.emailLabel}</label>
                  <input
                    className={[inp, loginErrors.email ? errInp : ok].join(" ")}
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginErrors.email) setLoginErrors((p) => { const n = { ...p }; delete n.email; return n; });
                    }}
                    onBlur={() => {
                      if (!normalizeEmail(loginEmail)) setLoginErrors((p) => ({ ...p, email: t.requiredField }));
                      else if (!isValidEmail(loginEmail)) setLoginErrors((p) => ({ ...p, email: t.invalidEmail }));
                    }}
                    placeholder="name@company.com"
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                  />
                  {loginErrors.email && <p className={eCls}>{loginErrors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className={`flex items-center justify-between mb-2 ${isAr ? "flex-row-reverse" : ""}`}>
                    <label className="text-sm font-semibold text-slate-800">{t.passwordLabel}</label>
                    <Link href="/manager/forgot-password" className="text-xs font-semibold text-sky-700 hover:text-purple-600 underline underline-offset-4 transition-colors">
                      {t.forgotPassword}
                    </Link>
                  </div>
                  <div className="flex items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => setLoginShowPass((v) => !v)}
                      className="h-[56px] w-[72px] shrink-0 rounded-2xl border border-slate-200 bg-white/90 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500"
                      aria-label={loginShowPass ? t.hidePassword : t.showPassword}
                    >
                      {loginShowPass ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                    </button>
                    <input
                      type={loginShowPass ? "text" : "password"}
                      className={["h-[56px]", inp, loginErrors.password ? errInp : ok].join(" ")}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginErrors.password) setLoginErrors((p) => { const n = { ...p }; delete n.password; return n; });
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                  {loginErrors.password && <p className={eCls}>{loginErrors.password}</p>}
                </div>

                <button
                  disabled={!loginCanSubmit}
                  className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800 shadow-[0_14px_34px_rgba(2,132,199,0.30)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                >
                  {loginBusy ? t.loginBusy : t.loginSubmit}
                </button>
                <div className="pt-1 text-xs text-slate-500 text-center">{t.footer}</div>
              </form>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === "register" && (
            <div className="px-10 pt-5 pb-10">
              {regGlobalErr && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 text-center">
                  {regGlobalErr}
                </div>
              )}
              <form onSubmit={onRegisterSubmit} noValidate className="space-y-5">
                {/* Full name */}
                <div>
                  <label className={labelCls}>{t.nameLabel}</label>
                  <input
                    className={[inp, regErrors.name ? errInp : ok].join(" ")}
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (regErrors.name) setRegErrors((p) => { const n = { ...p }; delete n.name; return n; });
                    }}
                    placeholder={t.namePlaceholder}
                    autoComplete="name"
                    type="text"
                  />
                  {regErrors.name && <p className={eCls}>{regErrors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>{t.emailLabel}</label>
                  <input
                    className={[inp, regErrors.email ? errInp : ok].join(" ")}
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regErrors.email) setRegErrors((p) => { const n = { ...p }; delete n.email; return n; });
                    }}
                    onBlur={() => {
                      if (!normalizeEmail(regEmail)) setRegErrors((p) => ({ ...p, email: t.requiredField }));
                      else if (!isValidEmail(regEmail)) setRegErrors((p) => ({ ...p, email: t.invalidEmail }));
                    }}
                    placeholder="name@company.com"
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                  />
                  {regErrors.email && <p className={eCls}>{regErrors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className={labelCls}>{t.passwordLabel}</label>
                  <div className="flex items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => setRegShowPass((v) => !v)}
                      className="h-[56px] w-[72px] shrink-0 rounded-2xl border border-slate-200 bg-white/90 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500"
                      aria-label={regShowPass ? t.hidePassword : t.showPassword}
                    >
                      {regShowPass ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                    </button>
                    <input
                      type={regShowPass ? "text" : "password"}
                      className={["h-[56px]", inp, regErrors.password ? errInp : ok].join(" ")}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regErrors.password) setRegErrors((p) => { const n = { ...p }; delete n.password; return n; });
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  {regErrors.password && <p className={eCls}>{regErrors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={labelCls}>{t.confirmLabel}</label>
                  <div className="flex items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => setRegShowConfirm((v) => !v)}
                      className="h-[56px] w-[72px] shrink-0 rounded-2xl border border-slate-200 bg-white/90 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500"
                      aria-label={regShowConfirm ? t.hidePassword : t.showPassword}
                    >
                      {regShowConfirm ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                    </button>
                    <input
                      type={regShowConfirm ? "text" : "password"}
                      className={["h-[56px]", inp, regErrors.confirm ? errInp : ok].join(" ")}
                      value={regConfirm}
                      onChange={(e) => {
                        setRegConfirm(e.target.value);
                        if (regErrors.confirm) setRegErrors((p) => { const n = { ...p }; delete n.confirm; return n; });
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  {regErrors.confirm && <p className={eCls}>{regErrors.confirm}</p>}
                </div>

                <button
                  disabled={!regCanSubmit}
                  className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800 shadow-[0_14px_34px_rgba(2,132,199,0.30)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                >
                  {regBusy ? t.regBusy : t.regSubmit}
                </button>
                <div className="pt-1 text-xs text-slate-500 text-center">{t.footer}</div>
              </form>
            </div>
          )}
        </div>

        {/* Driver link – outside the card */}
        <div className="mt-6 text-center text-sm sm:text-base text-slate-600">
          <span>{t.driverQuestion}</span>{" "}
          <Link
            href="/login"
            className="font-semibold text-sky-700 hover:text-purple-600 underline underline-offset-4 transition-colors"
          >
            {t.driverLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
