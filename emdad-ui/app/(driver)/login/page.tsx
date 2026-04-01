"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY  = "drv_token";
const DRIVER_KEY = "drv_info";
const LANG_KEY   = "rasid_lang";

type Lang = "ar" | "en";

function saveCreds(token: string, driver: object, remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(DRIVER_KEY, JSON.stringify(driver));
}

function EyeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function DriverLoginPage() {
  const router = useRouter();

  const [lang, setLang]             = useState<Lang>("ar");
  const [mounted, setMounted]       = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [remember, setRemember]     = useState(false);
  const [busy, setBusy]             = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [globalErr, setGlobalErr]   = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "ar") setLang(saved as Lang);
    const t = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    if (t) router.replace("/fuel");
    setMounted(true);
  }, [router]);

  useEffect(() => { try { localStorage.setItem(LANG_KEY, lang); } catch { /**/ } }, [lang]);

  // ── Derived (no hooks below) ──
  const isAr = lang === "ar";
  const dir  = isAr ? "rtl" : "ltr";

  // t must be computed before the mounted guard (useMemo is a hook)
  const t = useMemo(() => isAr ? {
    brand: "راصد", title: "تسجيل دخول السائق",
    subtitle: "أدخل رقمك الوظيفي وكلمة المرور للمتابعة",
    idLabel: "الرقم الوظيفي", idPlaceholder: "مثال: DRV-1001",
    passLabel: "كلمة المرور", passPlaceholder: "••••••••",
    showPassword: "إظهار كلمة المرور", hidePassword: "إخفاء كلمة المرور",
    remember: "تذكّرني", submit: "دخول", busy: "جارٍ التحقق...",
    required: "هذا الحقل مطلوب",
    errInvalid: "رقم الموظف أو كلمة المرور غير صحيحة",
    errServer: "خطأ في الاتصال بالخادم، حاول مجدداً",
    footer: "منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
    backLabel: "رجوع لصفحة التسجيل",
    managerQuestion: "هل أنت مدير؟",
    managerLink: "سجّل دخولك من هنا",
  } : {
    brand: "Rasid", title: "Driver Login",
    subtitle: "Enter your employee ID and password to continue",
    idLabel: "Employee ID", idPlaceholder: "e.g. DRV-1001",
    passLabel: "Password", passPlaceholder: "••••••••",
    showPassword: "Show password", hidePassword: "Hide password",
    remember: "Remember me", submit: "Login", busy: "Verifying...",
    required: "This field is required",
    errInvalid: "Invalid employee ID or password",
    errServer: "Server error, please try again",
    footer: "Rasid Fleet & Fuel Management",
    backLabel: "Back to main page",
    managerQuestion: "Are you a manager?",
    managerLink: "Sign in here",
  }, [isAr]);

  // Guard: don't render until client is mounted (avoids hydration mismatch)
  if (!mounted) return null;

  const canSubmit = employeeId.trim().length > 0 && password.length > 0 && !busy;

  function validate() {
    const e: Record<string, string> = {};
    if (!employeeId.trim()) e.employeeId = t.required;
    if (!password)          e.password   = t.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setGlobalErr("");
    try {
      const res = await fetch(`${API_BASE}/api/driver/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGlobalErr(data?.detail || t.errInvalid); return; }
      saveCreds(data.access_token, data.driver, remember);
      router.replace("/fuel");
    } catch {
      setGlobalErr(t.errServer);
    } finally {
      setBusy(false);
    }
  }

  const inp  = "w-full rounded-2xl border bg-white/90 px-5 py-4 text-sm text-slate-950 outline-none focus:ring-4";
  const ok   = "border-slate-200 focus:ring-purple-200 focus:border-purple-500";
  const err  = "border-red-300 focus:ring-red-100 focus:border-red-400";
  const eCls = "mt-2 px-1 text-xs font-medium text-red-700";

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-[radial-gradient(1200px_640px_at_50%_8%,rgba(56,189,248,0.20),transparent_58%),radial-gradient(900px_520px_at_12%_92%,rgba(14,165,233,0.14),transparent_55%),linear-gradient(to_bottom,#f9fcff,#edf6ff)]">

      {/* Lang */}
      <div className="fixed top-6 right-8 z-50 flex items-center gap-3 text-sm font-semibold select-none">
        <button onClick={() => setLang("en")} className={lang === "en" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"}>EN</button>
        <span className="text-slate-400">|</span>
        <button onClick={() => setLang("ar")} className={lang === "ar" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"}>AR</button>
      </div>

      <div className="w-full max-w-[620px]">
        <div className="rounded-[36px] border border-slate-200/70 bg-white/25 backdrop-blur-xl overflow-hidden">

          {/* Header */}
          <div className="px-12 pt-12 pb-7 text-center">
            <div className="inline-flex items-center justify-center gap-3 select-none mb-6">
              <svg width="44" height="44" viewBox="0 0 504.123 504.123" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
                <g className="text-purple-600"><polygon fill="currentColor" opacity="0.95" points="233.472,504.123 288.122,504.123 384.874,336.526 288.122,168.913 233.48,168.913 330.232,336.526"/></g>
                <g className="text-sky-700"><polygon fill="currentColor" opacity="0.95" points="216.001,335.218 270.659,335.21 173.891,167.613 270.659,0 216.001,0 119.249,167.613"/></g>
              </svg>
              <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800 bg-clip-text text-transparent">{t.brand}</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{t.title}</div>
            <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
          </div>

          {/* Form */}
          <div className="px-12 pb-12">
            {globalErr && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 text-center">
                {globalErr}
              </div>
            )}
            <form onSubmit={onSubmit} noValidate className="space-y-5">

              {/* Employee ID */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  {t.idLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  className={[inp, errors.employeeId ? err : ok].join(" ")}
                  value={employeeId}
                  onChange={(e) => { setEmployeeId(e.target.value); if (e.target.value.trim()) setErrors(p => { const n={...p}; delete n.employeeId; return n; }); }}
                  placeholder={t.idPlaceholder}
                  autoComplete="username"
                  autoCapitalize="none"
                />
                {errors.employeeId && <p className={eCls}>{errors.employeeId}</p>}
              </div>

              {/* Password */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  {t.passLabel} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="h-[56px] w-[72px] shrink-0 rounded-2xl border border-slate-200 bg-white/90 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500"
                    aria-label={showPass ? t.hidePassword : t.showPassword}
                  >
                    {showPass ? <EyeIcon size={22} /> : <EyeOffIcon size={22} />}
                  </button>
                  <input
                    type={showPass ? "text" : "password"}
                    className={["h-[56px]", inp, errors.password ? err : ok].join(" ")}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (e.target.value) setErrors(p => { const n={...p}; delete n.password; return n; }); }}
                    placeholder={t.passPlaceholder}
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && <p className={eCls}>{errors.password}</p>}
              </div>

              {/* Remember */}
              <label className="flex items-center gap-3 select-none cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-200" />
                <span className="text-sm font-semibold text-slate-700">{t.remember}</span>
              </label>

              {/* Submit */}
              <button type="submit" disabled={!canSubmit}
                className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800 shadow-[0_14px_34px_rgba(2,132,199,0.30)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                {busy ? t.busy : t.submit}
              </button>

              <div className="pt-1 text-xs text-slate-500 text-center">{t.footer}</div>
            </form>
          </div>
        </div>

        {/* ── رابط الرجوع للصفحة الرئيسية (تسجيل المانجر) ── */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <span>{t.managerQuestion}</span>{" "}
          <Link
            href="/"
            className="font-semibold text-sky-700 hover:text-purple-600 underline underline-offset-4 transition-colors"
          >
            {t.managerLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
