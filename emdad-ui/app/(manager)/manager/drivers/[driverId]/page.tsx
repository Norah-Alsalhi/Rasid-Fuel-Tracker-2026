"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import KPI from "@/components/manager/KPI";
import { requireMgrAuthOrRedirect } from "@/lib/mgrAuth";

type FuelEntry = {
  id: string;
  employee_id: string;
  driver_name: string;
  station_name: string;
  fill_datetime: string;
  liters: number;
  total_price: number;
  status: string;
  license_plate?: string | null;
};

function num(n: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.round(n));
}
function money(n: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.round(n));
}
function getErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export default function DriverDetails() {
  const router = useRouter();
  const params = useParams<{ driverId: string }>();
  const driverId = decodeURIComponent(params.driverId);

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
        const res = await fetch(`${base}/api/fuel_entries?employee_id=${encodeURIComponent(driverId)}&limit=200&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "فشل تحميل بيانات السائق");
        setItems(data.items || []);
      } catch (e: unknown) {
        setErr(getErrMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [driverId, router]);

  const header = useMemo(() => {
    const first = items[0];
    return {
      name: first?.driver_name || "—",
      employee_id: driverId,
      license_plate: first?.license_plate || "—",
      active: true,
    };
  }, [items, driverId]);

  const stats = useMemo(() => {
    const totalLiters = items.reduce((a, x) => a + (Number(x.liters) || 0), 0);
    const totalCost = items.reduce((a, x) => a + (Number(x.total_price) || 0), 0);
    const avg = items.length ? totalLiters / items.length : 0;
    return { totalLiters, totalCost, avg, count: items.length };
  }, [items]);

  return (
    <div>
      <button onClick={() => router.back()} className="text-slate-600 hover:underline mb-4">
        العودة للسائقين
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-extrabold">{header.name}</div>
          <div className="text-slate-500 mt-1">
            <span className="px-2 py-1 rounded-lg bg-slate-100">{header.employee_id}</span>
            <span className="mx-2">•</span>
            لوحة: <span className="font-semibold">{header.license_plate}</span>
          </div>
        </div>
        <span className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-bold">نشط</span>
      </div>

      {loading && <div className="text-slate-500">جارٍ التحميل…</div>}
      {err && <div className="bg-red-50 text-red-700 p-3 rounded-xl">{err}</div>}

      {!loading && !err && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <KPI title="إجمالي الوقود" value={`${num(stats.totalLiters)} لتر`} sub="حسب الفترة الحالية" />
            <KPI title="إجمالي التكلفة" value={`${money(stats.totalCost)} ريال`} sub="حسب السجلات" />
            <KPI title="متوسط التعبئة" value={`${num(stats.avg)} لتر`} sub="لكل تعبئة" />
            <KPI title="عدد التعبئات" value={`${num(stats.count)}`} sub="في الفترة" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="font-bold mb-3">السجلات</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b">
                    <th className="text-right py-2">التاريخ</th>
                    <th className="text-right py-2">المحطة</th>
                    <th className="text-right py-2">اللترات</th>
                    <th className="text-right py-2">الإجمالي</th>
                    <th className="text-right py-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => (
                    <tr key={x.id} className="border-b">
                      <td className="py-2">{String(x.fill_datetime).slice(0, 10)}</td>
                      <td className="py-2">{x.station_name}</td>
                      <td className="py-2">{num(Number(x.liters) || 0)}</td>
                      <td className="py-2">{money(Number(x.total_price) || 0)}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-xs">{x.status}</span>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-slate-500">لا يوجد سجلات لهذا السائق.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
