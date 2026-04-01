"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE  = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "mgr_token";
const LANG_KEY  = "rasid_lang";

type Lang = "ar" | "en";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}
function authHdrs(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Driver = {
  id: string; employee_id: string; name: string;
  plate?: string; phone?: string; active: boolean;
};
type FuelEntry = {
  id: string; employee_id: string; driver_name: string;
  station_name: string; fill_datetime: string;
  liters: number; total_price: number;
  odometer_reading?: string; status?: string;
};

/* ── Icons ── */
const I = {
  Dash:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Drivers: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="5"/><path d="M17 14H17.35C18.86 14 20.14 15.13 20.33 16.63L20.72 19.75C20.87 20.95 19.94 22 18.73 22H5.27C4.06 22 3.13 20.95 3.28 19.75L3.67 16.63C3.86 15.13 5.14 14 6.65 14H7"/></svg>,
  Fuel:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V8l9-6 9 6v14"/><path d="M9 22V12h6v10"/></svg>,
  Logout:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Plus:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Refresh: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-3.36"/></svg>,
  Cal:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  X:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Eye:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

function RasidLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 504.123 504.123" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
      <g className="text-purple-400"><polygon fill="currentColor" opacity="0.95" points="233.472,504.123 288.122,504.123 384.874,336.526 288.122,168.913 233.48,168.913 330.232,336.526"/></g>
      <g className="text-sky-400"><polygon fill="currentColor" opacity="0.95" points="216.001,335.218 270.659,335.21 173.891,167.613 270.659,0 216.001,0 119.249,167.613"/></g>
    </svg>
  );
}

const COLORS = ["from-sky-500 to-cyan-400","from-purple-500 to-violet-400","from-emerald-500 to-teal-400","from-orange-500 to-amber-400","from-rose-500 to-pink-400"];
const av = (i: number) => COLORS[i % COLORS.length];
const ini = (n: string) => n.trim().split(" ").map(w=>w[0]).slice(0,2).join("");

function MiniBar({ v, max }: { v: number; max: number }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${max>0?Math.round(v/max*100):0}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-8 shrink-0">{Math.round(v)}ل</span>
    </div>
  );
}

/* ── Add Driver Modal ── */
function AddDriverModal({ isAr, onClose, onDone }: { isAr: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name:"", employee_id:"", plate:"", phone:"", password:"" });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(p=>({...p,[k]:e.target.value}));

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.name||!f.employee_id||!f.password) { setErr(isAr?"الاسم والرقم وكلمة المرور مطلوبة":"Name, ID and password required"); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/manager/drivers`, {
        method:"POST",
        headers:{"Content-Type":"application/json",...authHdrs()},
        body: JSON.stringify({ name:f.name.trim(), employee_id:f.employee_id.trim(), plate:f.plate.trim(), phone:f.phone.trim(), password_hash:f.password, active:true }),
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) { setErr(d?.detail||(isAr?"حدث خطأ":"Error")); return; }
      onDone(); onClose();
    } catch { setErr(isAr?"تعذّر الاتصال":"Connection error"); }
    finally { setBusy(false); }
  }

  const inp = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400";
  const lbl = "block text-xs font-bold text-slate-600 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.45)"}}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl" dir={isAr?"rtl":"ltr"}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <span className="text-lg font-extrabold text-slate-900">{isAr?"إضافة سائق جديد":"Add New Driver"}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><I.X /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {err && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{err}</div>}
          <div>
            <label className={lbl}>{isAr?"الاسم الكامل *":"Full Name *"}</label>
            <input className={inp} value={f.name} onChange={up("name")} placeholder={isAr?"أحمد محمد":"Ahmed Mohammed"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{isAr?"الرقم الوظيفي *":"Employee ID *"}</label>
              <input className={inp} value={f.employee_id} onChange={up("employee_id")} placeholder="DRV-1004" autoCapitalize="none" />
            </div>
            <div>
              <label className={lbl}>{isAr?"رقم اللوحة":"Plate"}</label>
              <input className={inp} value={f.plate} onChange={up("plate")} placeholder={isAr?"أ ب ع 1234":"ABC 1234"} />
            </div>
            <div>
              <label className={lbl}>{isAr?"الجوال":"Phone"}</label>
              <input className={inp} value={f.phone} onChange={up("phone")} placeholder="05XXXXXXXX" type="tel" />
            </div>
            <div>
              <label className={lbl}>{isAr?"كلمة المرور *":"Password *"}</label>
              <input className={inp} value={f.password} onChange={up("password")} placeholder="••••••••" type="password" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              {isAr?"إلغاء":"Cancel"}
            </button>
            <button type="submit" disabled={busy}
              className="flex-1 rounded-xl bg-gradient-to-l from-sky-600 via-cyan-500 to-blue-700 text-white py-3 text-sm font-semibold disabled:opacity-60 hover:brightness-105 transition-all">
              {busy?(isAr?"جارٍ الحفظ...":"Saving..."):(isAr?"إضافة":"Add Driver")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════ */
export default function ManagerDashboard() {
  const [lang, setLang]           = useState<Lang>("ar");
  const [mounted, setMounted]     = useState(false);
  const [nav, setNav]             = useState<"dash"|"drivers"|"fuel">("dash");
  const [selId, setSelId]         = useState<string|null>(null);
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [drivers, setDrivers]     = useState<Driver[]>([]);
  const [entries, setEntries]     = useState<FuelEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [search, setSearch]       = useState("");

  const isAr = lang === "ar";
  const dir  = isAr ? "rtl" : "ltr";

  const t = useMemo(() => isAr ? {
    brand:"راصد", dash:"لوحة التحكم", drivers:"السائقين", fuel:"سجل الوقود", logout:"تسجيل الخروج",
    sub:"نظرة عامة على أداء الأسطول واستهلاكه للوقود",
    add:"إضافة سائق", refresh:"تحديث", filter:"تصفية حسب التاريخ",
    from:"من", to:"إلى", reset:"إعادة تعيين", recs:"سجل",
    tf:"إجمالي الوقود", tc:"التكلفة الكلية", td:"السائقين النشطين", ta:"متوسط السائق",
    L:"لتر", R:"ريال", op:"عملية", topD:"تحليل استهلاك الوقود",
    det:"تفاصيل السائق", back:"رجوع", recTitle:"سجل التعبئات",
    cDate:"التاريخ", cSt:"المحطة", cL:"اللترات", cC:"التكلفة", cOd:"العداد", cStat:"الحالة",
    act:"نشط", inact:"غير نشط", none:"لا توجد سجلات",
    sp:"ابحث باسم السائق أو رقم اللوحة...", loading:"جارٍ التحميل...",
    pend:"معلق", appr:"مؤكد", rej:"مرفوض",
    foot:"منصة راصد لإدارة السائقين ومتابعة تعبئة الوقود",
  } as const : {
    brand:"Rasid", dash:"Dashboard", drivers:"Drivers", fuel:"Fuel Log", logout:"Logout",
    sub:"Fleet performance & fuel consumption overview",
    add:"Add Driver", refresh:"Refresh", filter:"Filter by date",
    from:"From", to:"To", reset:"Reset", recs:"records",
    tf:"Total Fuel", tc:"Total Cost", td:"Active Drivers", ta:"Avg per Driver",
    L:"L", R:"SAR", op:"fills", topD:"Fuel Consumption Analysis",
    det:"Driver Details", back:"Back", recTitle:"Fill Records",
    cDate:"Date", cSt:"Station", cL:"Litres", cC:"Cost", cOd:"Odometer", cStat:"Status",
    act:"Active", inact:"Inactive", none:"No records",
    sp:"Search by name or plate...", loading:"Loading...",
    pend:"Pending", appr:"Approved", rej:"Rejected",
    foot:"Rasid Fleet & Fuel Management",
  } as const, [isAr]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dr, en] = await Promise.all([
        fetch(`${API_BASE}/api/manager/drivers`,       { headers: authHdrs() }),
        fetch(`${API_BASE}/api/fuel_entries?limit=500`,{ headers: authHdrs() }),
      ]);
      if (dr.ok) { const d = await dr.json(); setDrivers(d.drivers||[]); }
      if (en.ok) { const e = await en.json(); setEntries(e.items||[]); }
    } catch {/**/} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved==="en"||saved==="ar") setLang(saved as Lang);
    if (!getToken()) { window.location.replace("/manager/login"); return; }
    setMounted(true);
    load();
  }, [load]);

  useEffect(() => { try { localStorage.setItem(LANG_KEY,lang); } catch {/**/} }, [lang]);

  if (!mounted) return null;

  /* ── filtered ── */
  const filtEnt = entries.filter(e => {
    const d = e.fill_datetime?.slice(0,10)??"";
    return (!dateFrom||d>=dateFrom) && (!dateTo||d<=dateTo);
  });

  const stats = {
    fuel: filtEnt.reduce((s,e)=>s+(e.liters||0),0),
    cost: filtEnt.reduce((s,e)=>s+(e.total_price||0),0),
    act:  drivers.filter(d=>d.active).length,
    cnt:  filtEnt.length,
  };

  const dTotals = drivers.map((d,i) => {
    const recs = filtEnt.filter(e=>e.employee_id===d.employee_id);
    return { ...d, idx:i, L:recs.reduce((s,e)=>s+(e.liters||0),0), C:recs.reduce((s,e)=>s+(e.total_price||0),0), n:recs.length, recs };
  }).sort((a,b)=>b.L-a.L);

  const maxL  = Math.max(...dTotals.map(d=>d.L), 1);
  const selD  = selId ? dTotals.find(d=>d.id===selId) : null;
  const filtD = dTotals.filter(d=>!search||d.name.includes(search)||d.employee_id.includes(search)||(d.plate||"").includes(search));

  function stTag(s?: string) {
    if (s==="approved") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t.appr}</span>;
    if (s==="rejected") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t.rej}</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t.pend}</span>;
  }

  function SC({ label, value, sub, accent }: { label:string; value:string; sub?:string; accent:string }) {
    return (
      <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">{label}</span>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{background:accent+"22"}}>
            <div className="w-2.5 h-2.5 rounded-full" style={{background:accent}}/>
          </div>
        </div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    );
  }

  function NI({ id, icon, label }: { id: typeof nav; icon: React.ReactNode; label: string }) {
    return (
      <button onClick={()=>{setNav(id);setSelId(null);}}
        className={["w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
          nav===id?"bg-white/20 text-white":"text-white/60 hover:text-white hover:bg-white/10"].join(" ")}>
        {icon}<span>{label}</span>
      </button>
    );
  }

  return (
    <div dir={dir} className="min-h-screen flex bg-[linear-gradient(to_bottom,#f0f6ff,#e8f2ff)]">

      {/* blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full opacity-20" style={{background:"radial-gradient(circle,rgba(56,189,248,.5),transparent 70%)"}}/>
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 rounded-full opacity-15" style={{background:"radial-gradient(circle,rgba(99,102,241,.4),transparent 70%)"}}/>
      </div>

      {showAdd && <AddDriverModal isAr={isAr} onClose={()=>setShowAdd(false)} onDone={load} />}

      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col sticky top-0 h-screen z-30"
        style={{background:"linear-gradient(180deg,#0f2a5e 0%,#1a3a7a 60%,#1e4494 100%)"}}>
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <RasidLogo />
          <div>
            <div className="text-white font-extrabold text-base leading-tight">{t.brand}</div>
            <div className="text-white/50 text-[10px]"></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NI id="dash"    icon={<I.Dash />}    label={t.dash} />
          <NI id="drivers" icon={<I.Drivers />} label={t.drivers} />
          <NI id="fuel"    icon={<I.Fuel />}    label={t.fuel} />
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link href="/manager/login"
            onClick={()=>{localStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_KEY);}}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <I.Logout/><span>{t.logout}</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 p-6 overflow-y-auto">

        {/* Topbar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {selD ? selD.name : nav==="dash" ? t.dash : nav==="drivers" ? t.drivers : t.fuel}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selD ? `${selD.employee_id}${selD.plate?" · "+selD.plate:""}` : t.sub}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold bg-white/70 backdrop-blur rounded-xl border border-slate-200/80 px-3 py-2">
              <button onClick={()=>setLang("ar")} className={isAr?"text-purple-600":"text-slate-400 hover:text-slate-700"}>AR</button>
              <span className="text-slate-300">|</span>
              <button onClick={()=>setLang("en")} className={!isAr?"text-purple-600":"text-slate-400 hover:text-slate-700"}>EN</button>
            </div>
            <button onClick={load} className="flex items-center gap-1.5 bg-white/70 backdrop-blur border border-slate-200/80 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white transition-colors">
              <I.Refresh/>{t.refresh}
            </button>
            <button onClick={()=>setShowAdd(true)}
              className="flex items-center gap-1.5 bg-gradient-to-l from-sky-600 via-cyan-500 to-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-md hover:brightness-105 transition-all">
              <I.Plus/>{t.add}
            </button>
          </div>
        </div>

        {/* Date filter */}
        <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/80 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider"><I.Cal/>{t.filter}</div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">{t.from}</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"/>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">{t.to}</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"/>
            </div>
            {(dateFrom||dateTo) && <button onClick={()=>{setDateFrom("");setDateTo("");}} className="text-xs font-semibold text-slate-500 hover:text-red-500 underline underline-offset-2">{t.reset}</button>}
            <span className="text-xs text-slate-400 mr-auto">{filtEnt.length} {t.recs}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-slate-400 font-semibold">{t.loading}</div>
        ) : (<>

          {/* ══ DASHBOARD ══ */}
          {nav==="dash" && !selD && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SC label={t.tf}  value={`${Math.round(stats.fuel).toLocaleString()} ${t.L}`} sub={`${stats.cnt} ${t.op}`} accent="#0ea5e9"/>
              <SC label={t.tc}  value={`${Math.round(stats.cost).toLocaleString()} ${t.R}`} accent="#8b5cf6"/>
              <SC label={t.td}  value={`${stats.act}/${drivers.length}`} accent="#10b981"/>
              <SC label={t.ta}  value={`${stats.act>0?Math.round(stats.fuel/stats.act):0} ${t.L}`} accent="#f59e0b"/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 p-5">
                <div className="font-extrabold text-slate-900 text-base mb-4">{t.topD}</div>
                <div className="space-y-3.5">
                  {dTotals.slice(0,8).map(d=>(
                    <div key={d.id} className="flex items-center gap-3">
                      <button onClick={()=>setSelId(d.id)}
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${av(d.idx)} flex items-center justify-center text-white text-xs font-extrabold shrink-0 hover:scale-105 transition-transform`}>
                        {ini(d.name)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <button onClick={()=>setSelId(d.id)} className="text-xs font-semibold text-slate-700 hover:text-blue-600 truncate">{d.name}</button>
                          <span className="text-xs text-slate-400 shrink-0 mr-2">{Math.round(d.C).toLocaleString()} ر</span>
                        </div>
                        <MiniBar v={d.L} max={maxL}/>
                      </div>
                    </div>
                  ))}
                  {dTotals.length===0 && <div className="text-sm text-slate-400 text-center py-8">{t.none}</div>}
                </div>
              </div>
              <div className="lg:col-span-2 bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 p-5">
                <div className="font-extrabold text-slate-900 text-base mb-3">{t.drivers}</div>
                <div className="space-y-1">
                  {dTotals.map(d=>(
                    <button key={d.id} onClick={()=>setSelId(d.id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${av(d.idx)} flex items-center justify-center text-white text-xs font-extrabold shrink-0`}>{ini(d.name)}</div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="text-xs font-bold text-slate-800 truncate">{d.name}</div>
                        <div className="text-[10px] text-slate-400">{d.employee_id}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-sky-700">{Math.round(d.L)}<span className="text-xs font-normal text-slate-400 mr-0.5">ل</span></div>
                        <div className={`text-[10px] font-bold ${d.active?"text-emerald-600":"text-slate-400"}`}>{d.active?t.act:t.inact}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>)}

          {/* ══ DRIVER DETAIL ══ */}
          {nav==="dash" && selD && (<>
            <button onClick={()=>setSelId(null)} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
              {isAr?"→":"←"} {t.back}
            </button>
            <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 p-5 mb-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${av(selD.idx)} flex items-center justify-center text-white font-extrabold text-lg shrink-0`}>{ini(selD.name)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-extrabold text-slate-900">{selD.name}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${selD.active?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{selD.active?t.act:t.inact}</span>
                  </div>
                  <div className="flex gap-4 mt-1 flex-wrap text-xs text-slate-500">
                    <span>{selD.employee_id}</span>
                    {selD.plate&&<span>🚛 {selD.plate}</span>}
                    {selD.phone&&<span>📞 {selD.phone}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <SC label={t.tf} value={`${Math.round(selD.L)} ${t.L}`} accent="#0ea5e9"/>
              <SC label={t.tc} value={`${Math.round(selD.C).toLocaleString()} ${t.R}`} accent="#8b5cf6"/>
              <SC label={isAr?"متوسط التعبئة":"Avg Fill"} value={`${selD.n>0?Math.round(selD.L/selD.n):0} ${t.L}`} accent="#10b981"/>
              <SC label={isAr?"عدد التعبئات":"Fill Count"} value={`${selD.n} ${t.op}`} accent="#f59e0b"/>
            </div>
            <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 font-extrabold text-slate-900">{t.recTitle}</div>
              {selD.recs.length===0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">{t.none}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/80">
                      {[t.cDate,t.cSt,t.cL,t.cC,t.cOd,t.cStat].map(h=>(
                        <th key={h} className="text-right px-4 py-3 text-xs font-bold text-slate-500 border-b border-slate-100">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {selD.recs.map((r,i)=>(
                        <tr key={r.id} className={i%2===0?"bg-white/40":"bg-slate-50/40"}>
                          <td className="px-4 py-3 text-slate-700 font-medium">{r.fill_datetime?.slice(0,10)}</td>
                          <td className="px-4 py-3 text-slate-700">{r.station_name}</td>
                          <td className="px-4 py-3 font-bold text-sky-700">{r.liters} ل</td>
                          <td className="px-4 py-3 font-bold text-purple-700">{Math.round(r.total_price)} ر</td>
                          <td className="px-4 py-3 text-slate-500">{r.odometer_reading?`${Number(r.odometer_reading).toLocaleString()} كم`:"—"}</td>
                          <td className="px-4 py-3">{stTag(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>)}

          {/* ══ DRIVERS LIST ══ */}
          {nav==="drivers" && (<>
            <div className="mb-5">
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.sp}
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtD.map(d=>(
                <div key={d.id} className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${av(d.idx)} flex items-center justify-center text-white font-extrabold text-sm shrink-0`}>{ini(d.name)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900">{d.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.active?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{d.active?t.act:t.inact}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{d.employee_id}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 mb-4">
                    {d.plate&&<span>🚛 {d.plate}</span>}
                    {d.phone&&<span>📞 {d.phone}</span>}
                    <span>⛽ {Math.round(d.L)} ل</span>
                    <span>💰 {Math.round(d.C).toLocaleString()} ر</span>
                  </div>
                  <button onClick={()=>{setSelId(d.id);setNav("dash");}}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors">
                    <I.Eye/>{t.det}
                  </button>
                </div>
              ))}
              <button onClick={()=>setShowAdd(true)}
                className="bg-white/40 backdrop-blur rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-8 text-slate-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/30 transition-all min-h-[180px]">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center"><I.Plus/></div>
                <span className="text-sm font-semibold">{t.add}</span>
              </button>
            </div>
          </>)}

          {/* ══ FUEL LOG ══ */}
          {nav==="fuel" && (
            <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 font-extrabold text-slate-900">{t.fuel}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50/80">
                    {[t.drivers,t.cDate,t.cSt,t.cL,t.cC,t.cOd,t.cStat].map(h=>(
                      <th key={h} className="text-right px-4 py-3 text-xs font-bold text-slate-500 border-b border-slate-100">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtEnt.length===0&&<tr><td colSpan={7} className="text-center py-12 text-slate-400">{t.none}</td></tr>}
                    {filtEnt.map((e,i)=>{
                      const di = drivers.findIndex(d=>d.employee_id===e.employee_id);
                      return (
                        <tr key={e.id} className={i%2===0?"bg-white/40":"bg-slate-50/40"}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${av(di)} flex items-center justify-center text-white text-[9px] font-extrabold shrink-0`}>{ini(e.driver_name||"؟")}</div>
                              <span className="text-xs font-medium text-slate-700">{e.driver_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{e.fill_datetime?.slice(0,10)}</td>
                          <td className="px-4 py-3 text-slate-700">{e.station_name}</td>
                          <td className="px-4 py-3 font-bold text-sky-700">{e.liters} ل</td>
                          <td className="px-4 py-3 font-bold text-purple-700">{Math.round(e.total_price)} ر</td>
                          <td className="px-4 py-3 text-slate-500">{e.odometer_reading?`${Number(e.odometer_reading).toLocaleString()} كم`:"—"}</td>
                          <td className="px-4 py-3">{stTag(e.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>)}

        <div className="mt-8 text-center text-xs text-slate-400">{t.foot}</div>
      </main>
    </div>
  );
}