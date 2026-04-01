"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Lang = "ar" | "en";
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

function pickInitialLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === "en" || saved === "ar") return saved;
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

/** نفس أيقونة اللوقين */
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

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<Lang>(() => pickInitialLang());
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const t = useMemo(() => {
    if (isAr) {
      return {
        brand: "راصد",
        subtitle: "نسيت كلمة المرور؟ يُـرجى إدخال بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور.",
        emailLabel: "البريد الإلكتروني",
        submit: "إرسال الرابط",
        busy: "جارٍ الإرسال...",
        back: "رجوع لتسجيل الدخول",
        requiredEmail: "البريد الإلكتروني مطلوب",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة",
        toastOk: "إذا كان البريد مسجّل لدينا، سيتم إرسال رابط إعادة التعيين.",
        toastFailed: "تعذر إرسال الرابط",
        footer: "منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
      };
    }
    return {
      brand: "Rasid",
      subtitle: "Enter your email and we’ll send you a reset link.",
      emailLabel: "Email",
      submit: "Send link",
      busy: "Sending...",
      back: "Back to login",
      requiredEmail: "Email is required",
      invalidEmail: "Invalid email format",
      toastOk: "If the email exists, a reset link will be sent.",
      toastFailed: "Could not send reset link",
      footer: "Rasid System",
    };
  }, [isAr]);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

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
    } catch {}
  }, [lang]);

  function validateEmailValue(v: string): string | null {
    const em = normalizeEmail(v);
    if (!em) return t.requiredEmail;
    if (!isValidEmail(em)) return t.invalidEmail;
    return null;
  }

  // ✅ نفس منطق صفحة اللوقين: زر الإرسال ما يتفعل إلا إذا الإيميل صحيح + مو busy
  const canSubmit = useMemo(() => {
    const em = normalizeEmail(email);
    return Boolean(em) && isValidEmail(em) && !busy;
  }, [email, busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const err = validateEmailValue(email);
    setFieldError(err);

    if (err) {
      showToast("error", err);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/manager/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });

      await readJsonSafe(res);

      // مهم: رسالة عامة حتى ما نكشف إذا الإيميل موجود أو لا
      showToast("success", t.toastOk);
    } catch {
      // حتى لو فشل: نفس الرسالة العامة (منع كشف)
      showToast("success", t.toastOk);
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

      {/* Toast */}
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

      {/* Language Switcher (نفس اللوقين) */}
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
        {/* ✅ الكارد */}
        <div className="rounded-[36px] border border-slate-200/70 bg-white/25 backdrop-blur-xl overflow-hidden">
          {/* Header */}
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

            <div className="mt-5">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{}</div>
              <p className="mt-3 text-sm sm:text-base text-slate-700">{t.subtitle}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-10 pb-10">
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Email */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.emailLabel}</label>

                <input
                  className={[
                    "w-full rounded-2xl border bg-white/90 px-5 py-4 text-sm text-slate-950 outline-none focus:ring-4",
                    fieldError
                      ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                      : "border-slate-200 focus:ring-purple-200 focus:border-purple-500",
                  ].join(" ")}
                  value={email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmail(v);

                    // ✅ نفس سلوك اللوقين: لا نعرض خطأ إلا بعد ما يكتب شيء
                    if (!v.trim()) setFieldError(null);
                    else setFieldError(validateEmailValue(v));
                  }}
                  onBlur={() => {
                    // ✅ عند الخروج من الحقل نثبت التحقق
                    setFieldError(validateEmailValue(email));
                  }}
                  placeholder="name@company.com"
                  autoComplete="email"
                  inputMode="email"
                />

                {fieldError ? (
  <p
    className={[
      "mt-2 px-1 text-xs font-medium text-red-700",
      isAr ? "text-right" : "text-left",
    ].join(" ")}
  >
    {fieldError}
  </p>
) : null}
              </div>

              {/* ✅ disabled مثل صفحة اللوقين */}
              <button
                disabled={!canSubmit}
                className={[
                  "w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white",
                  "bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800",
                  "shadow-[0_14px_34px_rgba(2,132,199,0.30)]",
                  canSubmit ? "hover:brightness-105" : "",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
                type="submit"
              >
                {busy ? t.busy : t.submit}
              </button>

              <div className="pt-2 text-xs text-slate-700 text-center">{t.footer}</div>
            </form>
          </div>
        </div>

        {/* ✅ الرابط صار تحت البوكس (برا الكارد) */}
        <div className="mt-6 text-center text-sm sm:text-base text-slate-700">
          <Link
            href="/manager/login"
            className="font-semibold text-sky-700 hover:text-purple-600 underline underline-offset-4 transition-colors"
          >
            {t.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
