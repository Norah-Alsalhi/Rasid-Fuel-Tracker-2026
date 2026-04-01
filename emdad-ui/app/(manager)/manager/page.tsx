"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KPI from "@/components/manager/KPI";
import { requireMgrAuthOrRedirect } from "@/lib/mgrAuth";

type FuelEntry = {
  id: string;
  employee_id: string;
  driver_name: string;
  station_name: string;
  liters: number;
  total_price: number;
  status: "pending" | "approved" | "rejected";
  fill_datetime: string;
  created_at?: string;
};

function money(n: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.round(n));
}
function num(n: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.round(n));
}

function getErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export default function ManagerDashboard() {
  const router = useRouter();
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
        const res = await fetch(`${base}/api/fuel_entries?limit=200&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "فشل تحميل البيانات");
        setItems(data.items || []);
      } catch (e: unknown) {
        setErr(getErrMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const stats = useMemo(() => {
    const totalLiters = items.reduce((a, x) => a + (Number(x.liters) || 0), 0);
    const totalCost = items.reduce((a, x) => a + (Number(x.total_price) || 0), 0);
    const driverSet = new Set(items.map((x) => x.employee_id).filter(Boolean));
    const pendingCount = items.filter((x) => x.status === "pending").length;
    const avgPerFill = items.length ? totalLiters / items.length : 0;
    return { totalLiters, totalCost, drivers: driverSet.size, pendingCount, avgPerFill };
  }, [items]);

  return (
    <div>
      <div className="bg-gradient-to-l from-sky-50 to-cyan-50 border border-slate-100 rounded-3xl p-6 mb-6">
        <div className="text-3xl font-extrabold text-blue-800">لوحة التحكم</div>
        <div className="text-slate-600 mt-1">نظرة عامة على أداء الأسطول واستهلاك الوقود</div>
      </div>

      {loading && <div className="text-slate-500">جارٍ تحميل البيانات…</div>}
      {err && <div className="bg-red-50 text-red-700 p-3 rounded-xl">{err}</div>}

      {!loading && !err && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <KPI title="إجمالي استهلاك الوقود" value={`${num(stats.totalLiters)} لتر`} sub={`عدد التعبئات: ${num(items.length)}`} />
            <KPI title="التكلفة الكلية" value={`${money(stats.totalCost)} ريال`} sub="حسب السجلات الحالية" />
            <KPI title="السائقين النشطين" value={`${num(stats.drivers)}`} sub="بحسب السجلات" />
            <KPI title="سجلات بانتظار الاعتماد" value={`${num(stats.pendingCount)}`} sub={`متوسط/تعبئة: ${num(stats.avgPerFill)} لتر`} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="font-bold mb-2">آخر السجلات</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b">
                    <th className="text-right py-2">السائق</th>
                    <th className="text-right py-2">الرقم الوظيفي</th>
                    <th className="text-right py-2">المحطة</th>
                    <th className="text-right py-2">اللترات</th>
                    <th className="text-right py-2">الإجمالي</th>
                    <th className="text-right py-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 8).map((x) => (
                    <tr key={x.id} className="border-b">
                      <td className="py-2">{x.driver_name}</td>
                      <td className="py-2">{x.employee_id}</td>
                      <td className="py-2">{x.station_name}</td>
                      <td className="py-2">{num(Number(x.liters) || 0)}</td>
                      <td className="py-2">{money(Number(x.total_price) || 0)}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded-lg text-xs bg-slate-100">
                          {x.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={6}>
                        لا يوجد سجلات بعد.
                      </td>
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
