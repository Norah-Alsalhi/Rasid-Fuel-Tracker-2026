import Sidebar from "./Sidebar";

export default function ManagerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="flex flex-row-reverse">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
