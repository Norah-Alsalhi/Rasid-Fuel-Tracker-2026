type KPIProps = {
  title: string;
  value: string;
  sub?: string;
};

export default function KPI({ title, value, sub }: KPIProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="text-sm text-slate-500 font-medium mb-1">{title}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
