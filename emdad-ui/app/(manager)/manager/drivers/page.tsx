"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireMgrAuthOrRedirect } from "@/lib/mgrAuth";
import DriverCard, { type DriverCardModel } from "@/components/manager/DriverCard";

type FuelEntry = {
  id: string;
  employee_id: string;
  driver_name: string;
  license_plate?: string | null;
  created_at?: string;
};

function getErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export default function DriversPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = requireMgrAuthOrRedirect(router);
    if (!token) return;

    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
        const res = await fetch(`${base}/api/fuel_entries?limit=300&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "فشل تحميل السجلات");
        setItems(data.items || []);
      } catch (e: unknown) {
        setErr(getErrMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const drivers = useMemo(() => {
    // MVP: نكوّن السائقين من سجلات الوقود (بعدين نخليها من جدول drivers)
    const map = new Map<string, DriverCardModel>();
    for (const x of items) {
      if (!x.employee_id) continue;
      if (!map.has(x.employee_id)) {
        map.set(x.employee_id, {
          driverId: x.employee_id,
          employee_id: x.employee_id,
          name: x.driver_name || "—",
          license_plate: x.license_plate || null,
          active: true,
          joined_at: x.created_at ? String(x.created_at).slice(0, 10) : null,
        });
      }
    }
    const list = Array.from(map.values());
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((d) =>
      (d.name || "").toLowerCase().includes(s) ||
      (d.employee_id || "").toLowerCase().includes(s) ||
      (d.license_plate || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-3xl font-extrabold">إدارة السائقين</div>
          <div className="text-slate-600 mt-1">قائمة بجميع السائقين المسجلين وحالتهم الحالية</div>
        </div>
        <button className="px-4 py-3 rounded-xl bg-blue-700 text-white font-bold">
          + إضافة سائق جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث باسم السائق، رقم اللوحة أو الرقم الوظيفي…"
          className="w-full border rounded-xl p-3"
        />
      </div>

      {loading && <div className="text-slate-500">جارٍ تحميل…</div>}
      {err && <div className="bg-red-50 text-red-700 p-3 rounded-xl">{err}</div>}

      {!loading && !err && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {drivers.map((d) => (
            <DriverCard key={d.driverId} d={d} />
          ))}
          {drivers.length === 0 && (
            <div className="text-slate-500">لا يوجد سائقين.</div>
          )}
        </div>
      )}
    </div>
  );
}
