"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/manager", label: "لوحة التحكم" },
  { href: "/manager/drivers", label: "السائقين" },
  { href: "/manager/fuel", label: "سجل الوقود" },
  { href: "/manager/trucks", label: "إدارة الشاحنات" }, // اختياري لاحقًا
  { href: "/manager/settings", label: "الإعدادات" },     // اختياري لاحقًا
];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  function logout() {
    try {
      localStorage.removeItem("mgr_token");
      localStorage.removeItem("mgr_email");
    } catch {}
    window.location.href = "/manager/login";
  }

  return (
    <aside className="w-[290px] shrink-0 min-h-screen text-white bg-gradient-to-b from-blue-700 to-blue-950">
      {/* Top / Brand */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold leading-none">راصـد</div>
            <div className="text-xs text-white/70 mt-1"></div>
          </div>

          <div className="w-11 h-11 rounded-2xl bg-white/10 grid place-items-center text-lg">
            🚚
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-4 space-y-2">
        {NAV.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-4 py-3 rounded-2xl transition border",
                active
                  ? "bg-cyan-400/90 border-cyan-200 text-blue-950 font-extrabold"
                  : "bg-white/0 border-white/0 text-white/90 hover:bg-white/10 hover:border-white/10"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10"
        >
          تسجيل الخروج
        </button>

        <div className="text-xs text-white/50 mt-3 text-center">
          إمداد — لوحة الإدارة
        </div>
      </div>
    </aside>
  );
}
