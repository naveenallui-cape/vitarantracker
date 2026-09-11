"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Live activity" },
  { href: "/employees", label: "Employees" },
  { href: "/devices", label: "Devices" },
  { href: "/reports", label: "Reports" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]" suppressHydrationWarning>
      <aside className="bg-[#14231c] text-[#f4f7f3]">
        <div className="px-6 py-8">
          <p className="text-xs tracking-[0.22em] uppercase text-[#9fb8a8]">
            Vitaran
          </p>
          <h1 className="mt-1 text-xl font-semibold">Tracker</h1>
          <p className="mt-3 text-sm text-[#c5d6cc]">
            Company-owned Windows laptops. Activity state only.
          </p>
        </div>
        <nav className="px-3 pb-8">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 block rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-[#1f6f4a] text-white"
                    : "text-[#d7e4dc] hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => void logout()}
            className="mt-6 block w-full rounded-lg px-3 py-2 text-left text-sm text-[#d7e4dc] hover:bg-white/10"
          >
            Sign out
          </button>
        </nav>
      </aside>
      <main className="px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
