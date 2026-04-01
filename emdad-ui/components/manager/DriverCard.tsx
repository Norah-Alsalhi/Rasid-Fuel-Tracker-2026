import Link from "next/link";

export type DriverCardModel = {
  driverId: string;
  name: string;
  employee_id: string;
  phone?: string | null;
  license_plate?: string | null;
  active?: boolean;
  joined_at?: string | null;
};

export default function DriverCard({ d }: { d: DriverCardModel }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-100" />
        <div className="flex-1">
          <div className="font-extrabold">{d.name}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="px-2 py-1 rounded-lg bg-slate-100">{d.employee_id}</span>
          </div>
        </div>
        <span className={`w-2 h-2 rounded-full ${d.active ? "bg-green-500" : "bg-orange-400"}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-slate-700">
        <div>
          <div className="text-xs text-slate-400">رقم اللوحة</div>
          <div className="font-semibold">{d.license_plate || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">الجوال</div>
          <div className="font-semibold">{d.phone || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">تاريخ الانضمام</div>
          <div className="font-semibold">{d.joined_at || "—"}</div>
        </div>
      </div>

      <Link
        href={`/manager/drivers/${encodeURIComponent(d.driverId)}`}
        className="mt-4 block text-center border border-slate-200 rounded-xl py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        عرض التفاصيل والسجلات
      </Link>
    </div>
  );
}