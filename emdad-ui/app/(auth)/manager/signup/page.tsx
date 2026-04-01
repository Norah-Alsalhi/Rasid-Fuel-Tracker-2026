"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

/* ===== Remember Me Storage Keys (نفس اللوقين) ===== */
const TOKEN_KEY = "mgr_token";
const REMEMBER_KEY = "mgr_remember";
const EMAIL_KEY = "mgr_email";

/* ===== Phone Countries (SVG) ===== */
type Country = {
  code: string;
  nameAr: string;
  nameEn: string;
  dial: string;
  flagSvg: string;
};

const flagUrl = (code: string) => `https://flagcdn.com/${code.toLowerCase()}.svg`;

const COUNTRIES: Country[] = [
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", dial: "+966", flagSvg: flagUrl("SA") },
  { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", dial: "+971", flagSvg: flagUrl("AE") },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", dial: "+965", flagSvg: flagUrl("KW") },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", dial: "+974", flagSvg: flagUrl("QA") },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", dial: "+973", flagSvg: flagUrl("BH") },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman", dial: "+968", flagSvg: flagUrl("OM") },

  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", dial: "+962", flagSvg: flagUrl("JO") },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", dial: "+961", flagSvg: flagUrl("LB") },
  { code: "PS", nameAr: "فلسطين", nameEn: "Palestine", dial: "+970", flagSvg: flagUrl("PS") },
  { code: "SY", nameAr: "سوريا", nameEn: "Syria", dial: "+963", flagSvg: flagUrl("SY") },

  { code: "IN", nameAr: "الهند", nameEn: "India", dial: "+91", flagSvg: flagUrl("IN") },
  { code: "PK", nameAr: "باكستان", nameEn: "Pakistan", dial: "+92", flagSvg: flagUrl("PK") },
  { code: "BD", nameAr: "بنغلاديش", nameEn: "Bangladesh", dial: "+880", flagSvg: flagUrl("BD") },
  { code: "NP", nameAr: "نيبال", nameEn: "Nepal", dial: "+977", flagSvg: flagUrl("NP") },
  { code: "LK", nameAr: "سريلانكا", nameEn: "Sri Lanka", dial: "+94", flagSvg: flagUrl("LK") },

  { code: "PH", nameAr: "الفلبين", nameEn: "Philippines", dial: "+63", flagSvg: flagUrl("PH") },
  { code: "ID", nameAr: "إندونيسيا", nameEn: "Indonesia", dial: "+62", flagSvg: flagUrl("ID") },
  { code: "TH", nameAr: "تايلاند", nameEn: "Thailand", dial: "+66", flagSvg: flagUrl("TH") },
  { code: "VN", nameAr: "فيتنام", nameEn: "Vietnam", dial: "+84", flagSvg: flagUrl("VN") },

  { code: "EG", nameAr: "مصر", nameEn: "Egypt", dial: "+20", flagSvg: flagUrl("EG") },
  { code: "SD", nameAr: "السودان", nameEn: "Sudan", dial: "+249", flagSvg: flagUrl("SD") },
  { code: "ET", nameAr: "إثيوبيا", nameEn: "Ethiopia", dial: "+251", flagSvg: flagUrl("ET") },
  { code: "KE", nameAr: "كينيا", nameEn: "Kenya", dial: "+254", flagSvg: flagUrl("KE") },
  { code: "NG", nameAr: "نيجيريا", nameEn: "Nigeria", dial: "+234", flagSvg: flagUrl("NG") },
  { code: "GH", nameAr: "غانا", nameEn: "Ghana", dial: "+233", flagSvg: flagUrl("GH") },

  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", dial: "+44", flagSvg: flagUrl("GB") },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", dial: "+49", flagSvg: flagUrl("DE") },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", dial: "+33", flagSvg: flagUrl("FR") },
  { code: "IT", nameAr: "إيطاليا", nameEn: "Italy", dial: "+39", flagSvg: flagUrl("IT") },

  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", dial: "+1", flagSvg: flagUrl("US") },
  { code: "CA", nameAr: "كندا", nameEn: "Canada", dial: "+1", flagSvg: flagUrl("CA") },
];

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

function saveToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
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

/** ✅ مهم: لا تقرأ localStorage هنا أبداً */
function pickInitialLang(): Lang {
  return "ar";
}

/* ================= Password Rules ================= */
function escapeForCharClass(s: string) {
  return s.replace(/[-\\\]^]/g, "\\$&");
}

const ALLOWED_SYMBOLS = "@#$%^&*)(";
const PASS_ALLOWED_CHARS_REGEX = new RegExp(`[^A-Za-z0-9${escapeForCharClass(ALLOWED_SYMBOLS)}]`, "g");

const PASS_STRONG_REGEX = new RegExp(
  `^(?=.*[A-Za-z])(?=.*\\d)(?=.*[${escapeForCharClass(ALLOWED_SYMBOLS)}])[A-Za-z0-9${escapeForCharClass(
    ALLOWED_SYMBOLS
  )}]{8,}$`
);

function isStrongPassword(v: string) {
  return PASS_STRONG_REGEX.test(v);
}

type PassStrength = 0 | 1 | 2 | 3;

function getPassStrength(v: string): {
  score: PassStrength;
  hasLetter: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  lenOk: boolean;
} {
  const lenOk = v.length >= 8;
  const hasLetter = /[A-Za-z]/.test(v);
  const hasDigit = /\d/.test(v);
  const hasSymbol = new RegExp(`[${escapeForCharClass(ALLOWED_SYMBOLS)}]`).test(v);

  const rawScore = Number(lenOk) + Number(hasLetter) + Number(hasDigit) + Number(hasSymbol); // 0..4
  const normalized: PassStrength = rawScore >= 4 ? 3 : (rawScore as PassStrength); // 0..3
  return { score: normalized, hasLetter, hasDigit, hasSymbol, lenOk };
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
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

function EyeOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M5.112,18.784l-2.153,2.156c-0.585,0.586 -0.585,1.536 0.001,2.121c0.586,0.585 1.536,0.585 2.121,-0.001l2.666,-2.668c1.898,0.983 4.19,1.806 6.773,2.041l0,3.567c0,0.828 0.672,1.5 1.5,1.5c0.828,-0 1.5,-0.672 1.5,-1.5l0,-3.571c2.147,-0.201 4.091,-0.806 5.774,-1.571l3.199,3.202c0.585,0.586 1.535,0.586 2.121,0.001c0.586,-0.585 0.586,-1.535 0.001,-2.121l-2.579,-2.581c2.59,-1.665 4.091,-3.369 4.091,-3.369c0.546,-0.622 0.485,-1.57 -0.137,-2.117c-0.622,-0.546 -1.57,-0.485 -2.117,0.137c0,-0 -4.814,5.49 -11.873,5.49c-7.059,0 -11.873,-5.49 -11.873,-5.49c-0.547,-0.622 -0.1.495,-0.683 -0.137c-0.622,0.547 -0.683,1.495 -0.137,2.117c0,0 1.175,1.334 3.239,2.794Z" />
    </svg>
  );
}

function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

type ToastKind = "success" | "error";
type ToastState = { open: boolean; kind: ToastKind; message: string };

function isLikelyNonEnglishPassword(v: string) {
  // أي حروف غير لاتينية (مثل العربية) -> يفضّل تنبيه المستخدم
  return /[^\x00-\x7F]/.test(v) || /[\u0600-\u06FF]/.test(v);
}

function cxInput(hasErr?: boolean) {
  return [
    "w-full rounded-2xl border bg-white/90 px-5 py-4 text-sm text-slate-950 outline-none focus:ring-4",
    hasErr ? "border-red-300 focus:ring-red-100 focus:border-red-400" : "border-slate-200 focus:ring-purple-200 focus:border-purple-500",
  ].join(" ");
}

/* ================= Email Domain Suggestions (NEW) ================= */
const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "live.com", "proton.me", "protonmail.com"];

function buildEmailSuggestions(rawEmail: string): string[] {
  const v = rawEmail.trim();
  if (!v) return [];
  if (/\s/.test(v)) return [];
  const atCount = (v.match(/@/g) || []).length;
  if (atCount > 1) return [];

  // ignore if already looks complete (has @ and a dot after it)
  const atIdx = v.indexOf("@");
  if (atIdx >= 0) {
    const local = v.slice(0, atIdx).trim();
    const domainPart = v.slice(atIdx + 1).trim().toLowerCase();
    if (!local) return [];
    if (domainPart.includes(".") && domainPart.length >= 3) return []; // already "looks done"

    const filtered = EMAIL_DOMAINS.filter((d) => d.startsWith(domainPart));
    const list = (filtered.length ? filtered : EMAIL_DOMAINS).slice(0, 6);
    return list.map((d) => `${local}@${d}`);
  }

  // no @ yet -> suggest adding @domain
  const local = v;
  if (!local || local.length < 1) return [];
  return EMAIL_DOMAINS.slice(0, 6).map((d) => `${local}@${d}`);
}

export default function ManagerSignupPage() {
  const router = useRouter();

  const [lang, setLang] = useState<Lang>(() => pickInitialLang());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === "en" || saved === "ar") setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}
  }, [lang, hydrated]);

  const effectiveLang: Lang = hydrated ? lang : "ar";
  const isAr = effectiveLang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const t = useMemo(() => {
    if (isAr) {
      return {
        brand: "راصد",
        subtitle: " يسعدنا انضمامك إلينا! أنشئ حسابك الآن وابدأ باستكشاف  منصة راصد.",
        firstNameLabel: "الاسم",
        lastNameLabel: "اسم العائلة",
        phoneLabel: "رقم الجوال",
        emailLabel: "البريد الإلكتروني",
        passLabel: "كلمة المرور",
        pass2Label: "تأكيد كلمة المرور",
        remember: "تذكرني",
        submit: "إنشاء الحساب",
        busy: "جارٍ الإنشاء...",
        footer: "منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
        haveAccount: "لديك حساب؟",
        login: "تسجيل الدخول",

        requiredFirstName: "الاسم مطلوب",
        requiredLastName: "اسم العائلة مطلوب",
        requiredPhone: "رقم الجوال مطلوب",
        invalidPhone: "رقم الجوال غير صحيح",
        requiredEmail: "البريد الإلكتروني مطلوب",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة",

        requiredPass: "كلمة المرور مطلوبة",
        passRules: `كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم ورمز من: ${ALLOWED_SYMBOLS}`,
        passNotMatch: "كلمتا المرور غير متطابقتين",

        signupFailed: (status: number) => `فشل إنشاء الحساب (${status})`,
        unexpected: "حدث خطأ غير متوقع",
        toastOk: "تم إنشاء الحساب بنجاح",
        toastCheck: "تحقق من البيانات",
        showPassword: "إظهار كلمة المرور",
        hidePassword: "إخفاء كلمة المرور",
        selectCountry: "اختيار الدولة",
        searchCountry: "ابحث عن دولة...",

        strengthWeak: "ضعيف",
        strengthOk: "متوسط",
        strengthStrong: "قوي",

        allowedSymbolsOnly: `الرموز المسموحة فقط: ${ALLOWED_SYMBOLS}`,

        mustUseEnglishKb: "غيّر لوحة المفاتيح للإنجليزية لأن كلمة المرور لازم تكون إنجليزية",
        passReq_len: "8 أحرف+",
        passReq_letter: "حرف",
        passReq_digit: "رقم",
        passReq_symbol: "رمز",

        // NEW (optional, tiny)
        emailSuggestionAria: "اقتراحات البريد الإلكتروني",
      };
    }

    return {
      brand: "Rasid",
      subtitle: "Welcome aboard! Sign up now to start exploring Rasid Platform.",
      firstNameLabel: "First name",
      lastNameLabel: "Last name",
      phoneLabel: "Phone number",
      emailLabel: "Email",
      passLabel: "Password",
      pass2Label: "Confirm password",
      remember: "Remember me",
      submit: "Create account",
      busy: "Creating...",
      footer: "Rasid System",
      haveAccount: "Already have an account?",
      login: "Sign in",

      requiredFirstName: "First name is required",
      requiredLastName: "Last name is required",
      requiredPhone: "Phone number is required",
      invalidPhone: "Invalid phone number",
      requiredEmail: "Email is required",
      invalidEmail: "Invalid email format",

      requiredPass: "Password is required",
      passRules: `Password must be at least 8 characters and include a letter, a number, and a symbol from: ${ALLOWED_SYMBOLS}`,
      passNotMatch: "Passwords do not match",

      signupFailed: (status: number) => `Signup failed (${status})`,
      unexpected: "Unexpected error",
      toastOk: "Account created successfully",
      toastCheck: "Please check your inputs",
      showPassword: "Show password",
      hidePassword: "Hide password",
      selectCountry: "Select country",
      searchCountry: "Search country...",

      strengthWeak: "Weak",
      strengthOk: "Okay",
      strengthStrong: "Strong",

      allowedSymbolsOnly: `Allowed symbols only: ${ALLOWED_SYMBOLS}`,

      mustUseEnglishKb: "Switch to English keyboard — password must be in English",
      passReq_len: "8+ chars",
      passReq_letter: "Letter",
      passReq_digit: "Number",
      passReq_symbol: "Symbol",

      // NEW (optional, tiny)
      emailSuggestionAria: "Email suggestions",
    };
  }, [isAr]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [remember, setRemember] = useState(true);
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const reduceMotion = usePrefersReducedMotion();

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", message: "" });
  const toastTimerRef = useRef<number | null>(null);

  const [countryOpen, setCountryOpen] = useState(false);
  const countryWrapRef = useRef<HTMLDivElement | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [passInvalidChars, setPassInvalidChars] = useState(false);
  const passInvalidTimerRef = useRef<number | null>(null);
  const [passNonEnglishHint, setPassNonEnglishHint] = useState(false);
  const passNonEnglishTimerRef = useRef<number | null>(null);

  /* ===== Email suggestions (NEW) ===== */
  const [emailSugOpen, setEmailSugOpen] = useState(false);
  const [emailSugIndex, setEmailSugIndex] = useState(0);
  const emailSugWrapRef = useRef<HTMLDivElement | null>(null);

  const emailSuggestions = useMemo(() => {
    // show suggestions while typing, but not if already valid
    if (!email.trim()) return [];
    if (isValidEmail(email.trim())) return [];
    return buildEmailSuggestions(email);
  }, [email]);

  useEffect(() => {
    // if list changes, reset index
    setEmailSugIndex(0);
    // auto close if no suggestions
    if (emailSuggestions.length === 0) setEmailSugOpen(false);
  }, [emailSuggestions.length]);

  function applyEmailSuggestion(v: string) {
    setEmail(v);
    setEmailSugOpen(false);

    // also update fieldErrors live
    if (!v.trim()) setFieldErrors((p) => ({ ...p, email: t.requiredEmail }));
    else if (!isValidEmail(v)) setFieldErrors((p) => ({ ...p, email: t.invalidEmail }));
    else
      setFieldErrors((p) => {
        const n = { ...p };
        delete n.email;
        return n;
      });
  }

  useEffect(() => {
    // close email sug on outside click
    if (!emailSugOpen) return;

    const onDown = (ev: MouseEvent | TouchEvent) => {
      const el = emailSugWrapRef.current;
      if (!el) return;
      if (el.contains(ev.target as Node)) return;
      setEmailSugOpen(false);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setEmailSugOpen(false);
    };

    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("touchstart", onDown, true);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("touchstart", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [emailSugOpen]);

  function flashInvalidChars() {
    setPassInvalidChars(true);
    if (passInvalidTimerRef.current) window.clearTimeout(passInvalidTimerRef.current);
    passInvalidTimerRef.current = window.setTimeout(() => {
      setPassInvalidChars(false);
      passInvalidTimerRef.current = null;
    }, 2600);
  }

  function flashNonEnglishHint() {
    setPassNonEnglishHint(true);
    if (passNonEnglishTimerRef.current) window.clearTimeout(passNonEnglishTimerRef.current);
    passNonEnglishTimerRef.current = window.setTimeout(() => {
      setPassNonEnglishHint(false);
      passNonEnglishTimerRef.current = null;
    }, 2600);
  }

  useEffect(() => {
    return () => {
      if (passInvalidTimerRef.current) window.clearTimeout(passInvalidTimerRef.current);
      if (passNonEnglishTimerRef.current) window.clearTimeout(passNonEnglishTimerRef.current);
    };
  }, []);

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
    if (serverError) setServerError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, phone, email, password, password2, effectiveLang]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(REMEMBER_KEY);
      if (r === "0") setRemember(false);
      if (r === "1") setRemember(true);

      const savedEmail = localStorage.getItem(EMAIL_KEY);
      if (savedEmail) setEmail(savedEmail);
    } catch {}
  }, []);

  /** ✅ اغلاق القائمة اذا ضغطتي برا */
  useEffect(() => {
    if (!countryOpen) return;

    const onDown = (ev: MouseEvent | TouchEvent) => {
      const el = countryWrapRef.current;
      if (!el) return;
      if (el.contains(ev.target as Node)) return;
      setCountryOpen(false);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setCountryOpen(false);
    };

    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("touchstart", onDown, true);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("touchstart", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [countryOpen]);

  function isValidPhoneDigits(v: string) {
    return /^\d{7,14}$/.test(v);
  }

  function sanitizePasswordInput(v: string) {
    return v.replace(PASS_ALLOWED_CHARS_REGEX, "");
  }

  const strength = useMemo(() => getPassStrength(password), [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    if (strength.score <= 1) return t.strengthWeak;
    if (strength.score === 2) return t.strengthOk;
    return t.strengthStrong;
  }, [password, strength.score, t.strengthWeak, t.strengthOk, t.strengthStrong]);

  const strengthColor = useMemo(() => {
    if (!password) return "bg-slate-200";
    if (strength.score <= 1) return "bg-red-500";
    if (strength.score === 2) return "bg-yellow-400";
    return "bg-emerald-500";
  }, [password, strength.score]);

  const strengthTextClass = useMemo(() => {
    if (!password) return "text-slate-400";
    if (strength.score <= 1) return "text-red-700";
    if (strength.score === 2) return "text-yellow-700";
    return "text-emerald-700";
  }, [password, strength.score]);

  const strengthBars = useMemo(() => {
    const n = strength.score; // 0..3
    return [1, 2, 3].map((i) => (password && n >= i ? strengthColor : "bg-slate-200"));
  }, [strength.score, strengthColor, password]);

  const countryList = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => {
      const name = (isAr ? c.nameAr : c.nameEn).toLowerCase();
      return name.includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [countryQuery, isAr]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};

    if (!firstName.trim()) e.firstName = t.requiredFirstName;
    if (!lastName.trim()) e.lastName = t.requiredLastName;

    if (!phone.trim()) e.phone = t.requiredPhone;
    else if (!isValidPhoneDigits(phone)) e.phone = t.invalidPhone;

    const em = normalizeEmail(email);
    if (!em) e.email = t.requiredEmail;
    else if (!isValidEmail(em)) e.email = t.invalidEmail;

    if (!password) e.password = t.requiredPass;
    else if (!isStrongPassword(password)) e.password = t.passRules;

    if (password2 !== password) e.password2 = t.passNotMatch;

    return e;
  }

  useEffect(() => {
    setFieldErrors((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      return validate();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLang]);

  const canSubmit = useMemo(() => {
    const e = validate();
    return Object.keys(e).length === 0 && !busy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, phone, email, password, password2, busy, effectiveLang]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      showToast("error", t.toastCheck);
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/manager/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: `${country.dial}${phone}`,
          email: normalizeEmail(email),
          password,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        const msg = pickErrorMessage(data, t.signupFailed(res.status));
        showToast("error", msg);
        throw new Error(msg);
      }

      const token = getAccessToken(data);
      // ✅ احفظ تفضيلات remember دائمًا
      persistRememberPrefs(remember, normalizeEmail(email));

      if (token) saveToken(token, remember);

      showToast("success", t.toastOk);
      router.replace(token ? "/manager" : "/manager/login");
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

      {/* Language Switcher (يتبدّل حسب الاتجاه) */}
      <div className="fixed top-6 right-8 z-50 select-none">
        <div className="flex items-center gap-3 text-sm sm:text-base font-semibold">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={["transition-none", effectiveLang === "en" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"].join(" ")}
            aria-pressed={effectiveLang === "en"}
          >
            EN
          </button>

          <span className="text-slate-400 font-normal">|</span>

          <button
            type="button"
            onClick={() => setLang("ar")}
            className={["transition-none", effectiveLang === "ar" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"].join(" ")}
            aria-pressed={effectiveLang === "ar"}
          >
            AR
          </button>
        </div>
      </div>

      <div className="w-full max-w-[700px] relative">
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
              <p className="mt-3 text-sm sm:text-base text-slate-700">{t.subtitle}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-10 pb-10">
            {serverError ? (
              <div className={["mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", isAr ? "text-right" : "text-left"].join(" ")}>
                {serverError}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-5">
              {/* First + Last */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={isAr ? "text-right" : "text-left"}>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">{t.firstNameLabel}</label>
                  <input
                    className={cxInput(Boolean(fieldErrors.firstName))}
                    value={firstName}
                    autoFocus
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={fieldErrors.firstName ? "err-firstName" : undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFirstName(v);
                      if (!v.trim()) setFieldErrors((p) => ({ ...p, firstName: t.requiredFirstName }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.firstName;
                          return n;
                        });
                    }}
                    autoComplete="given-name"
                  />
                  {fieldErrors.firstName ? (
                    <p id="err-firstName" className={["mt-2 px-1 text-xs font-medium text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                      {fieldErrors.firstName}
                    </p>
                  ) : null}
                </div>

                <div className={isAr ? "text-right" : "text-left"}>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">{t.lastNameLabel}</label>
                  <input
                    className={cxInput(Boolean(fieldErrors.lastName))}
                    value={lastName}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={fieldErrors.lastName ? "err-lastName" : undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLastName(v);
                      if (!v.trim()) setFieldErrors((p) => ({ ...p, lastName: t.requiredLastName }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.lastName;
                          return n;
                        });
                    }}
                    autoComplete="family-name"
                  />
                  {fieldErrors.lastName ? (
                    <p id="err-lastName" className={["mt-2 px-1 text-xs font-medium text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                      {fieldErrors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Phone */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.phoneLabel}</label>

                <div className="flex items-stretch gap-3">
                  <div
                    ref={countryWrapRef}
                    className={[
                      "relative h-[44px] w-[120px] shrink-0",
                      "rounded-2xl border bg-white/90",
                      "outline-none focus-within:ring-4",
                      fieldErrors.phone
                        ? "border-red-300 focus-within:ring-red-100 focus-within:border-red-400"
                        : "border-slate-200 focus-within:ring-purple-200 focus-within:border-purple-500",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCountryOpen((v) => !v);
                        if (!countryOpen) setCountryQuery("");
                      }}
                      className="w-full h-full px-3 flex items-center justify-between rounded-2xl"
                      aria-haspopup="listbox"
                      aria-expanded={countryOpen}
                      aria-label={t.selectCountry}
                    >
                      <div className="flex items-center gap-2">
                        <Image src={country.flagSvg} alt="" width={22} height={16} className="rounded-[3px] shrink-0" unoptimized />
                        <span dir="ltr" className="text-sm font-medium text-slate-900">
                          {country.dial}
                        </span>
                      </div>

                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        className={["shrink-0 text-slate-500 transition-transform", countryOpen ? "rotate-180" : ""].join(" ")}
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {countryOpen ? (
                      <div
                        className={[
                          "absolute top-full mt-2 z-50",
                          isAr ? "right-0" : "left-0",
                          "w-[220px] max-w-[90vw]",
                          "rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden",
                        ].join(" ")}
                        role="listbox"
                      >
                        <div className="p-2 border-b border-slate-100">
                          <input
                            value={countryQuery}
                            onChange={(e) => setCountryQuery(e.target.value)}
                            placeholder={t.searchCountry}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
           text-black placeholder:text-black
           outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400
           dark:text-black dark:placeholder:text-black"
                          />
                        </div>

                        <div className="max-h-[280px] overflow-auto py-1">
                          {countryList.map((c) => {
                            const active = c.code === country.code;

                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setCountry(c);
                                  setCountryOpen(false);
                                }}
                                className={[
                                  "w-full px-4 py-2 flex items-center justify-between",
                                  active ? "bg-slate-100" : "hover:bg-slate-50",
                                  isAr ? "text-right" : "text-left",
                                ].join(" ")}
                                role="option"
                                aria-selected={active}
                              >
                                <span className="text-sm text-slate-900 truncate">{isAr ? c.nameAr : c.nameEn}</span>
                                <span dir="ltr" className="text-sm text-slate-600 shrink-0">
                                  {c.dial}
                                </span>
                              </button>
                            );
                          })}

                          {countryList.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500">{isAr ? "لا توجد نتائج" : "No results"}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <input
                    className={[
                      "h-[44px] w-full min-w-0",
                      "rounded-2xl border bg-white/90 px-5",
                      "text-sm text-slate-950 outline-none focus:ring-4",
                      fieldErrors.phone
                        ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                        : "border-slate-200 focus:ring-purple-200 focus:border-purple-300",
                    ].join(" ")}
                    value={phone}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "err-phone" : undefined}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setPhone(digits);

                      if (!digits) setFieldErrors((p) => ({ ...p, phone: t.requiredPhone }));
                      else if (!isValidPhoneDigits(digits)) setFieldErrors((p) => ({ ...p, phone: t.invalidPhone }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.phone;
                          return n;
                        });
                    }}
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>

                {fieldErrors.phone ? (
                  <p id="err-phone" className={["mt-2 px-1 text-xs font-medium text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                    {fieldErrors.phone}
                  </p>
                ) : null}
              </div>

              {/* Email */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.emailLabel}</label>

                {/* wrapper for suggestions */}
                <div ref={emailSugWrapRef} className="relative">
                  <input
                    className={cxInput(Boolean(fieldErrors.email))}
                    value={email}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "err-email" : undefined}
                    onFocus={() => {
                      if (emailSuggestions.length) setEmailSugOpen(true);
                    }}
                    onBlur={() => {
                      // close on blur BUT allow click selection (handled by outside click + preventDefault on mousedown)
                      // so we don't force-close here
                    }}
                    onKeyDown={(ev) => {
                      if (!emailSugOpen || emailSuggestions.length === 0) return;

                      if (ev.key === "ArrowDown") {
                        ev.preventDefault();
                        setEmailSugIndex((i) => Math.min(i + 1, emailSuggestions.length - 1));
                      } else if (ev.key === "ArrowUp") {
                        ev.preventDefault();
                        setEmailSugIndex((i) => Math.max(i - 1, 0));
                      } else if (ev.key === "Enter") {
                        // apply selection if suggestions open
                        const pick = emailSuggestions[emailSugIndex];
                        if (pick) {
                          ev.preventDefault();
                          applyEmailSuggestion(pick);
                        }
                      } else if (ev.key === "Escape") {
                        setEmailSugOpen(false);
                      }
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmail(v);

                      if (!v.trim()) setFieldErrors((p) => ({ ...p, email: t.requiredEmail }));
                      else if (!isValidEmail(v)) setFieldErrors((p) => ({ ...p, email: t.invalidEmail }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.email;
                          return n;
                        });

                      // open suggestions while typing if any
                      const next = buildEmailSuggestions(v);
                      setEmailSugOpen(next.length > 0);
                    }}
                    placeholder="name@company.com"
                    autoComplete="email"
                    inputMode="email"
                  />

                  {/* Suggestions dropdown */}
                  {emailSugOpen && emailSuggestions.length > 0 ? (
                    <div
                      className={[
                        "absolute top-full mt-2 z-50",
                        "w-full",
                        "rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden",
                      ].join(" ")}
                      role="listbox"
                      aria-label={t.emailSuggestionAria}
                    >
                      <div className="max-h-[220px] overflow-auto py-1">
                        {emailSuggestions.map((s, idx) => {
                          const active = idx === emailSugIndex;
                          return (
                            <button
                              key={s}
                              type="button"
                              role="option"
                              aria-selected={active}
                              // keep dropdown open to allow click selection even if input blurs
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyEmailSuggestion(s)}
                              className={[
                                "w-full px-4 py-2",
                                "flex items-center justify-between gap-3",
                                active ? "bg-slate-100" : "hover:bg-slate-50",
                                isAr ? "text-right" : "text-left",
                              ].join(" ")}
                            >
                              <span className="text-sm text-slate-900 truncate" dir="ltr">
                                {s}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {fieldErrors.email ? (
                  <p id="err-email" className={["mt-2 px-1 text-xs font-medium text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              {/* Password */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.passLabel}</label>

                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPass1((v) => !v)}
                    className={[
                      "h-[56px] w-[72px] shrink-0",
                      "rounded-2xl border border-slate-200 bg-white/90",
                      "flex items-center justify-center",
                      "text-slate-600 hover:text-slate-900 hover:bg-white",
                      "outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500",
                    ].join(" ")}
                    aria-label={showPass1 ? t.hidePassword : t.showPassword}
                    title={showPass1 ? t.hidePassword : t.showPassword}
                  >
                    {showPass1 ? <EyeIcon size={23} /> : <EyeOffIcon size={23} />}
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
                    type={showPass1 ? "text" : "password"}
                    value={password}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "err-pass" : undefined}
                    onChange={(e) => {
                      const raw = e.target.value;

                      // ✅ تنبيه لوحة مفاتيح لو دخل أحرف غير لاتينية
                      if (isLikelyNonEnglishPassword(raw)) flashNonEnglishHint();

                      const clean = sanitizePasswordInput(raw);

                      if (raw !== clean) flashInvalidChars();

                      setPassword(clean);

                      if (!clean) setFieldErrors((p) => ({ ...p, password: t.requiredPass }));
                      else if (!isStrongPassword(clean)) setFieldErrors((p) => ({ ...p, password: t.passRules }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.password;
                          return n;
                        });

                      if (password2 && password2 !== clean) setFieldErrors((p) => ({ ...p, password2: t.passNotMatch }));
                      if (password2 && password2 === clean)
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.password2;
                          return n;
                        });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");

                      if (isLikelyNonEnglishPassword(pasted)) flashNonEnglishHint();

                      const clean = sanitizePasswordInput(pasted);
                      if (pasted !== clean) flashInvalidChars();
                      setPassword((prev) => sanitizePasswordInput(prev + clean));
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    inputMode="text"
                  />
                </div>

                {passNonEnglishHint ? (
                  <div className={["mt-2 text-xs font-extrabold text-amber-700", isAr ? "text-right" : "text-left"].join(" ")}>
                    {t.mustUseEnglishKb}
                  </div>
                ) : null}

                {passInvalidChars ? (
                  <div className={["mt-2 text-xs font-extrabold text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                    {t.allowedSymbolsOnly}
                  </div>
                ) : null}

                {/* ✅ Password checklist */}
                {password ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-2">
                        <div className={["h-1.5 flex-1 rounded-full", strengthBars[0]].join(" ")} />
                        <div className={["h-1.5 flex-1 rounded-full", strengthBars[1]].join(" ")} />
                        <div className={["h-1.5 flex-1 rounded-full", strengthBars[2]].join(" ")} />
                      </div>

                      <span className={["text-xs font-extrabold", strengthTextClass].join(" ")}>{strengthLabel}</span>
                    </div>

                    <div className={["grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold", isAr ? "text-right" : "text-left"].join(" ")}>
                      <div
                        className={[
                          "rounded-xl border px-2 py-1",
                          strength.lenOk ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white/70 text-slate-600",
                        ].join(" ")}
                      >
                        {t.passReq_len}
                      </div>
                      <div
                        className={[
                          "rounded-xl border px-2 py-1",
                          strength.hasLetter ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white/70 text-slate-600",
                        ].join(" ")}
                      >
                        {t.passReq_letter}
                      </div>
                      <div
                        className={[
                          "rounded-xl border px-2 py-1",
                          strength.hasDigit ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white/70 text-slate-600",
                        ].join(" ")}
                      >
                        {t.passReq_digit}
                      </div>
                      <div
                        className={[
                          "rounded-xl border px-2 py-1",
                          strength.hasSymbol ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white/70 text-slate-600",
                        ].join(" ")}
                      >
                        {t.passReq_symbol}
                      </div>
                    </div>
                  </div>
                ) : null}

                {fieldErrors.password ? (
                  <p id="err-pass" className={["mt-2 px-1 text-xs font-medium text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              {/* Confirm Password */}
              <div className={isAr ? "text-right" : "text-left"}>
                <label className="block text-sm font-semibold text-slate-800 mb-2">{t.pass2Label}</label>

                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPass2((v) => !v)}
                    className={[
                      "h-[56px] w-[72px] shrink-0",
                      "rounded-2xl border border-slate-200 bg-white/90",
                      "flex items-center justify-center",
                      "text-slate-600 hover:text-slate-900 hover:bg-white",
                      "outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500",
                    ].join(" ")}
                    aria-label={showPass2 ? t.hidePassword : t.showPassword}
                    title={showPass2 ? t.hidePassword : t.showPassword}
                  >
                    {showPass2 ? <EyeIcon size={23} /> : <EyeOffIcon size={23} />}
                  </button>

                  <input
                    className={[
                      "h-[56px] w-full min-w-0",
                      "rounded-2xl border bg-white/90 px-5",
                      "text-sm text-slate-950 outline-none focus:ring-4",
                      fieldErrors.password2
                        ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                        : "border-slate-200 focus:ring-purple-200 focus:border-purple-300",
                    ].join(" ")}
                    type={showPass2 ? "text" : "password"}
                    value={password2}
                    aria-invalid={Boolean(fieldErrors.password2)}
                    aria-describedby={fieldErrors.password2 ? "err-pass2" : undefined}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (isLikelyNonEnglishPassword(raw)) flashNonEnglishHint();

                      const clean = sanitizePasswordInput(raw);
                      if (raw !== clean) flashInvalidChars();
                      setPassword2(clean);

                      if (clean !== password) setFieldErrors((p) => ({ ...p, password2: t.passNotMatch }));
                      else
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.password2;
                          return n;
                        });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");
                      if (isLikelyNonEnglishPassword(pasted)) flashNonEnglishHint();

                      const clean = sanitizePasswordInput(pasted);
                      if (pasted !== clean) flashInvalidChars();
                      setPassword2((prev) => sanitizePasswordInput(prev + clean));
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    inputMode="text"
                  />
                </div>

                {fieldErrors.password2 ? (
                  <p id="err-pass2" className={["mt-2 px-1 text-xs font-medium text-red-700", isAr ? "text-right" : "text-left"].join(" ")}>
                    {fieldErrors.password2}
                  </p>
                ) : null}
              </div>

              {/* ✅ Remember me فعليًا */}
              <div className={["flex items-center justify-between gap-3", isAr ? "flex-row-reverse" : ""].join(" ")}>
                <label className="flex items-center gap-3 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setRemember(v);
                      // حفظ فوري لتفضيل المستخدم
                      persistRememberPrefs(v, normalizeEmail(email || ""));
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-200"
                  />
                  <span className="text-sm font-semibold text-slate-800">{t.remember}</span>
                </label>
              </div>

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

        <div className="mt-6 text-center text-sm sm:text-base text-slate-700">
          <span className={isAr ? "ml-2" : "mr-2"}>{t.haveAccount}</span>
          <Link href="/manager/login" className="font-semibold text-sky-700 hover:text-purple-600 underline underline-offset-4 transition-colors">
            {t.login}
          </Link>
        </div>
      </div>
    </div>
  );
}
