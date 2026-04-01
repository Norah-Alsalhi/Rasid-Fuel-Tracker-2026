"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_BASE     = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY    = "drv_token";
const DRIVER_KEY   = "drv_info";
type Lang = "ar" | "en";
const LANG_STORAGE_KEY = "rasid_lang";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

function getDriver() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DRIVER_KEY) ?? sessionStorage.getItem(DRIVER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
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
    const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const apply = () => setReduce(Boolean(mq?.matches));
    apply();
    if (!mq) return;
    if ("addEventListener" in mq) { mq.addEventListener("change", apply); return () => mq.removeEventListener("change", apply); }
  }, []);
  return reduce;
}

function AnimatedGlowOverlay({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const anim = el.animate(
      [{ transform: "translate3d(-1.5%,-1.5%,0) scale(1.02)", opacity: 0.55 }, { transform: "translate3d(1.5%,1.5%,0) scale(1.03)", opacity: 0.7 }],
      { duration: 14000, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }
    );
    return () => anim.cancel();
  }, [enabled]);
  return <div ref={ref} className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(900px 560px at 18% 22%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(900px 560px at 82% 72%, rgba(59,130,246,0.16), transparent 60%)", opacity: 0.65 }} aria-hidden="true" />;
}

function DashboardIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 504.123 504.123" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
      <g className="text-purple-600">
        <polygon fill="currentColor" opacity="0.95" points="233.472,504.123 288.122,504.123 384.874,336.526 288.122,168.913 233.48,168.913 330.232,336.526" />
        <polyline fill="currentColor" opacity="0.72" points="330.232,336.526 233.472,504.123 288.122,504.123 384.874,336.526" />
      </g>
      <g className="text-sky-700">
        <polygon fill="currentColor" opacity="0.95" points="216.001,335.218 270.659,335.21 173.891,167.613 270.659,0 216.001,0 119.249,167.613" />
        <polyline fill="currentColor" opacity="0.72" points="119.249,167.613 216.001,335.218 270.659,335.21 173.891,167.613" />
      </g>
    </svg>
  );
}

function CameraIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}

type ToastKind = "success" | "error";
type ToastState = { open: boolean; kind: ToastKind; message: string };
type PhotoState = { file: File | null; preview: string | null };

function PhotoZone({ label, required = false, state, onChange, capture, isAr, hint }: {
  label: string; required?: boolean; state: PhotoState; onChange: (s: PhotoState) => void;
  capture?: "user" | "environment"; isAr: boolean; hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback((file: File) => { onChange({ file, preview: URL.createObjectURL(file) }); }, [onChange]);
  return (
    <div className={isAr ? "text-right" : "text-left"}>
      <label className="block text-sm font-semibold text-slate-800 mb-2">{label}{required && <span className="text-red-500 mr-1">*</span>}</label>
      <input ref={inputRef} type="file" accept="image/*" capture={capture} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {state.preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-emerald-50/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.preview} alt={label} className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-end">
            <div className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-emerald-300 text-sm font-semibold">✓ {isAr ? "تم الإرفاق" : "Attached"}</span>
              <button type="button" onClick={() => { onChange({ file: null, preview: null }); if (inputRef.current) inputRef.current.value = ""; }} className="text-white/80 hover:text-white text-xs underline">{isAr ? "تغيير" : "Change"}</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) handleFile(f); }}
          className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 flex flex-col items-center justify-center gap-2 py-7 text-slate-500 hover:border-purple-400 hover:bg-purple-50/40 hover:text-purple-600 transition-colors cursor-pointer">
          <CameraIcon size={26} />
          <span className="text-sm font-semibold">{isAr ? "اضغط للتصوير أو الاختيار" : "Tap to capture or pick"}</span>
          {hint && <span className="text-xs text-slate-400">{hint}</span>}
        </button>
      )}
    </div>
  );
}

export default function DriverFuelPage() {
  const router = useRouter();

  // ── كل الـ state قبل أي return ──
  const [lang, setLang] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ name: string; employee_id: string; plate: string } | null>(null);
  const [station, setStation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [liters, setLiters] = useState("");
  const [pricePerL, setPricePerL] = useState("");
  const [odometer, setOdometer] = useState("");
  const [photoOdo, setPhotoOdo] = useState<PhotoState>({ file: null, preview: null });
  const [photoPlate, setPhotoPlate] = useState<PhotoState>({ file: null, preview: null });
  const [photoReceipt, setPhotoReceipt] = useState<PhotoState>({ file: null, preview: null });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", message: "" });
  const toastTimer = useRef<number | null>(null);

  const isAr = lang === "ar";
  const dir  = isAr ? "rtl" : "ltr";

  const t = useMemo(() => isAr ? {
    brand: "راصد", pageTitle: "تسجيل تعبئة وقود",
    pageSubtitle: "أدخل بيانات التعبئة بدقة — ستصل مباشرة إلى المدير",
    section1: "بيانات التعبئة", section2: "المرفقات الإلزامية",
    stationLabel: "اسم المحطة", stationPlaceholder: "مثال: محطة الشمال",
    dateLabel: "تاريخ التعبئة", timeLabel: "وقت التعبئة",
    litersLabel: "عدد اللترات", litersPlaceholder: "مثال: 400",
    priceLabel: "سعر اللتر (ريال)", pricePlaceholder: "مثال: 1.45",
    totalLabel: "إجمالي التكلفة المحسوبة", totalUnit: "ريال سعودي",
    odometerLabel: "قراءة عداد المسافة (كم)", odometerPlaceholder: "مثال: 48500",
    photo_odometer: "صورة عداد المسافة", photo_odometer_hint: "صوّر عداد الكيلومترات بوضوح",
    photo_plate: "صورة لوحة الشاحنة", photo_plate_hint: "لوحة واضحة ومقروءة",
    photo_receipt: "صورة الفاتورة / الإيصال", photo_receipt_hint: "فاتورة المحطة أو الإيصال",
    submit: "إرسال للمدير", busy: "جارٍ الإرسال...",
    successMsg: "✅ تم إرسال بيانات التعبئة بنجاح — سيصلك تأكيد من المدير",
    errorMsg: "تعذّر الإرسال، حاول مجدداً",
    required: "هذا الحقل مطلوب", photoRequired: "يجب إرفاق الصورة",
    footer: "منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
  } as const : {
    brand: "Rasid", pageTitle: "Fuel Fill Record",
    pageSubtitle: "Enter fill details accurately — it goes straight to the manager.",
    section1: "Fill Details", section2: "Required Photos",
    stationLabel: "Station Name", stationPlaceholder: "e.g. North Station",
    dateLabel: "Fill Date", timeLabel: "Fill Time",
    litersLabel: "Litres", litersPlaceholder: "e.g. 400",
    priceLabel: "Price per Litre (SAR)", pricePlaceholder: "e.g. 1.45",
    totalLabel: "Calculated Total", totalUnit: "Saudi Riyals",
    odometerLabel: "Odometer Reading (km)", odometerPlaceholder: "e.g. 48500",
    photo_odometer: "Odometer Photo", photo_odometer_hint: "Clear shot of the odometer",
    photo_plate: "Truck Plate Photo", photo_plate_hint: "Readable plate number",
    photo_receipt: "Receipt / Invoice Photo", photo_receipt_hint: "Station receipt or invoice",
    submit: "Send to Manager", busy: "Sending...",
    successMsg: "✅ Fuel record submitted successfully",
    errorMsg: "Submission failed, please try again",
    required: "This field is required", photoRequired: "Photo is required",
    footer: "Rasid Fleet & Fuel Management",
  } as const, [isAr]);

  const total = useMemo(() => {
    const l = parseFloat(liters); const p = parseFloat(pricePerL);
    return l > 0 && p > 0 ? (l * p).toFixed(2) : null;
  }, [liters, pricePerL]);

  const canSubmit = useMemo(() => (
    station.trim().length > 0 && date.length > 0 && time.length > 0 &&
    parseFloat(liters) > 0 && parseFloat(pricePerL) > 0 && odometer.trim().length > 0 &&
    photoOdo.file !== null && photoPlate.file !== null && photoReceipt.file !== null && !busy
  ), [station, date, time, liters, pricePerL, odometer, photoOdo, photoPlate, photoReceipt, busy]);

  // ── useEffect بعد كل الـ state ──
  useEffect(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "ar") setLang(saved as Lang);
    const token = getToken();
    if (!token) { router.replace("/login"); return; }
    const d = getDriver();
    setDriverInfo(d ?? { name: "—", employee_id: "—", plate: "—" });
    // تعيين التاريخ والوقت الحالي
    setDate(new Date().toISOString().slice(0, 10));
    setTime(new Date().toTimeString().slice(0, 5));
    setMounted(true);
  }, [router]);

  useEffect(() => { try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /**/ } }, [lang]);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  // ── الآن يمكن الـ return المشروط ──
  if (!mounted) return null;

  function showToast(kind: ToastKind, message: string) {
    if (toastTimer.current) { window.clearTimeout(toastTimer.current); toastTimer.current = null; }
    setToast({ open: true, kind, message });
    toastTimer.current = window.setTimeout(() => { setToast((p) => ({ ...p, open: false })); toastTimer.current = null; }, 3500);
  }

  function clearErr(key: string) { setFieldErrors((p) => { const n = { ...p }; delete n[key]; return n; }); }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!station.trim()) errs.station = t.required;
    if (!date) errs.date = t.required;
    if (!time) errs.time = t.required;
    if (!(parseFloat(liters) > 0)) errs.liters = t.required;
    if (!(parseFloat(pricePerL) > 0)) errs.pricePerL = t.required;
    if (!odometer.trim()) errs.odometer = t.required;
    if (!photoOdo.file) errs.photoOdo = t.photoRequired;
    if (!photoPlate.file) errs.photoPlate = t.photoRequired;
    if (!photoReceipt.file) errs.photoReceipt = t.photoRequired;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("station",         station.trim());
      fd.append("date",            date);
      fd.append("time",            time);
      fd.append("liters",          liters);
      fd.append("price_per_liter", pricePerL);
      fd.append("total_cost",      total ?? "0");
      fd.append("odometer",        odometer.trim());
      if (photoOdo.file)     fd.append("photo_odometer", photoOdo.file);
      if (photoPlate.file)   fd.append("photo_plate",    photoPlate.file);
      if (photoReceipt.file) fd.append("photo_receipt",  photoReceipt.file);

      const res = await fetch(`${API_BASE}/api/driver/fuel-record`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (res.ok) {
        showToast("success", t.successMsg);
        setStation(""); setLiters(""); setPricePerL(""); setOdometer("");
        setPhotoOdo({ file: null, preview: null });
        setPhotoPlate({ file: null, preview: null });
        setPhotoReceipt({ file: null, preview: null });
        setFieldErrors({});
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data?.detail || t.errorMsg);
      }
    } catch {
      showToast("error", t.errorMsg);
    } finally {
      setBusy(false);
    }
  }

  const errCls = "mt-2 px-1 text-xs font-medium text-red-700";
  const inp = "w-full rounded-2xl border bg-white/90 px-5 py-4 text-sm text-slate-950 outline-none focus:ring-4";
  const ok = "border-slate-200 focus:ring-purple-200 focus:border-purple-500";
  const err = "border-red-300 focus:ring-red-100 focus:border-red-400";

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-[radial-gradient(1200px_640px_at_50%_8%,rgba(56,189,248,0.20),transparent_58%),radial-gradient(900px_520px_at_12%_92%,rgba(14,165,233,0.14),transparent_55%),radial-gradient(900px_520px_at_88%_86%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(to_bottom,#f9fcff,#edf6ff)]">
      <AnimatedGlowOverlay enabled={true} />

      {toast.open && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <div role="status" aria-live="polite" className={["rounded-2xl border px-5 py-3 text-sm backdrop-blur-xl font-medium shadow-lg", toast.kind === "success" ? "border-emerald-200 bg-emerald-50/95 text-emerald-900" : "border-red-200 bg-red-50/95 text-red-900", isAr ? "text-right" : "text-left"].join(" ")}>{toast.message}</div>
        </div>
      )}

      {/* Driver pill + logout - top left */}
      <div className="fixed top-4 left-8 z-50">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/70 border border-slate-200/80 backdrop-blur-xl shadow-sm">
          <svg className="shrink-0 text-sky-700" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M17 14H17.3517C18.8646 14 20.1408 15.1266 20.3285 16.6279L20.719 19.7519C20.8682 20.9456 19.9374 22 18.7344 22H5.26556C4.06257 22 3.1318 20.9456 3.28101 19.7519L3.67151 16.6279C3.85917 15.1266 5.13538 14 6.64835 14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-right flex-1">
            <div className="text-xs font-extrabold text-slate-900 leading-tight">{driverInfo?.name}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{driverInfo?.employee_id} · {driverInfo?.plate}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(DRIVER_KEY);
              sessionStorage.removeItem(TOKEN_KEY);
              sessionStorage.removeItem(DRIVER_KEY);
              router.replace("/login");
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors shrink-0 pr-1"
          >
            {isAr ? "خروج" : "Logout"}
          </button>
        </div>
      </div>

      <div className="fixed top-6 right-8 z-50 select-none flex items-center gap-3 text-sm font-semibold">
        <button type="button" onClick={() => setLang("en")} className={lang === "en" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"} aria-pressed={lang === "en"}>EN</button>
        <span className="text-slate-400 font-normal">|</span>
        <button type="button" onClick={() => setLang("ar")} className={lang === "ar" ? "text-purple-600" : "text-slate-500 hover:text-slate-800"} aria-pressed={lang === "ar"}>AR</button>
      </div>

      <div className="w-full max-w-[780px] relative">
        <div className="rounded-[36px] border border-slate-200/70 bg-white/25 backdrop-blur-xl overflow-hidden">

          <div className="relative px-10 pt-10 pb-6 text-center">
            <div className="inline-flex items-center justify-center gap-3 select-none">
              <DashboardIcon size={40} />
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800 bg-clip-text text-transparent">{t.brand}</span>
            </div>

            <div className="mt-4">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{t.pageTitle}</div>
              <p className="mt-2 text-sm sm:text-base text-slate-600">{t.pageSubtitle}</p>
            </div>
          </div>

          <div className="px-8 sm:px-10 pb-10">
            <form onSubmit={onSubmit} noValidate className="space-y-7">

              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{t.section1}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className={["sm:col-span-2", isAr ? "text-right" : "text-left"].join(" ")}>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">{t.stationLabel} <span className="text-red-500">*</span></label>
                    <input className={[inp, fieldErrors.station ? err : ok].join(" ")} value={station} placeholder={t.stationPlaceholder} autoComplete="off" onChange={(e) => { setStation(e.target.value); if (e.target.value.trim()) clearErr("station"); }} />
                    {fieldErrors.station && <p className={errCls}>{fieldErrors.station}</p>}
                  </div>
                  <div className={isAr ? "text-right" : "text-left"}>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">{t.dateLabel} <span className="text-red-500">*</span></label>
                    <input type="date" className={[inp, fieldErrors.date ? err : ok].join(" ")} value={date} onChange={(e) => { setDate(e.target.value); clearErr("date"); }} />
                    {fieldErrors.date && <p className={errCls}>{fieldErrors.date}</p>}
                  </div>
                  <div className={isAr ? "text-right" : "text-left"}>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">{t.timeLabel} <span className="text-red-500">*</span></label>
                    <input type="time" className={[inp, fieldErrors.time ? err : ok].join(" ")} value={time} onChange={(e) => { setTime(e.target.value); clearErr("time"); }} />
                    {fieldErrors.time && <p className={errCls}>{fieldErrors.time}</p>}
                  </div>
                  <div className={["sm:col-span-2", isAr ? "text-right" : "text-left"].join(" ")}>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">{t.odometerLabel} <span className="text-red-500">*</span></label>
                    <input type="number" inputMode="numeric" className={[inp, fieldErrors.odometer ? err : ok].join(" ")} value={odometer} placeholder={t.odometerPlaceholder} min="0" onChange={(e) => { setOdometer(e.target.value); if (e.target.value) clearErr("odometer"); }} />
                    {fieldErrors.odometer && <p className={errCls}>{fieldErrors.odometer}</p>}
                  </div>
                  <div className={isAr ? "text-right" : "text-left"}>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">{t.litersLabel} <span className="text-red-500">*</span></label>
                    <input type="number" inputMode="decimal" className={[inp, fieldErrors.liters ? err : ok].join(" ")} value={liters} placeholder={t.litersPlaceholder} min="0" step="0.1" onChange={(e) => { setLiters(e.target.value); if (parseFloat(e.target.value) > 0) clearErr("liters"); }} />
                    {fieldErrors.liters && <p className={errCls}>{fieldErrors.liters}</p>}
                  </div>
                  <div className={isAr ? "text-right" : "text-left"}>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">{t.priceLabel} <span className="text-red-500">*</span></label>
                    <input type="number" inputMode="decimal" className={[inp, fieldErrors.pricePerL ? err : ok].join(" ")} value={pricePerL} placeholder={t.pricePlaceholder} min="0" step="0.01" onChange={(e) => { setPricePerL(e.target.value); if (parseFloat(e.target.value) > 0) clearErr("pricePerL"); }} />
                    {fieldErrors.pricePerL && <p className={errCls}>{fieldErrors.pricePerL}</p>}
                  </div>
                </div>
                {total && (
                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-l from-sky-50 to-blue-50 border border-blue-100 px-6 py-4">
                    <span className="text-sm font-semibold text-slate-600">{t.totalLabel}</span>
                    <div className={isAr ? "text-left" : "text-right"}>
                      <span className="text-2xl font-extrabold text-blue-800">{total}</span>
                      <span className="text-xs text-slate-500 mr-2">{t.totalUnit}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{t.section2}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <PhotoZone label={t.photo_odometer} required state={photoOdo} onChange={(s) => { setPhotoOdo(s); if (s.file) clearErr("photoOdo"); }} capture="environment" isAr={isAr} hint={t.photo_odometer_hint} />
                    {fieldErrors.photoOdo && <p className={errCls}>{fieldErrors.photoOdo}</p>}
                  </div>
                  <div>
                    <PhotoZone label={t.photo_plate} required state={photoPlate} onChange={(s) => { setPhotoPlate(s); if (s.file) clearErr("photoPlate"); }} capture="environment" isAr={isAr} hint={t.photo_plate_hint} />
                    {fieldErrors.photoPlate && <p className={errCls}>{fieldErrors.photoPlate}</p>}
                  </div>
                  <div>
                    <PhotoZone label={t.photo_receipt} required state={photoReceipt} onChange={(s) => { setPhotoReceipt(s); if (s.file) clearErr("photoReceipt"); }} capture="environment" isAr={isAr} hint={t.photo_receipt_hint} />
                    {fieldErrors.photoReceipt && <p className={errCls}>{fieldErrors.photoReceipt}</p>}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={!canSubmit} className={["w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white", "bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-800", "shadow-[0_14px_34px_rgba(2,132,199,0.30)]", canSubmit ? "hover:brightness-105" : "", "disabled:opacity-60 disabled:cursor-not-allowed transition-all"].join(" ")}>
                {busy ? t.busy : t.submit}
              </button>
              <div className="pt-1 text-xs text-slate-500 text-center">{t.footer}</div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
