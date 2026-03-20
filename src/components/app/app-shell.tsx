"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, CalendarClock, ClipboardList, Contact2, LayoutDashboard, Menu, Moon, Settings, Shapes, Sun, Users, Wallet, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/use-auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/domains", label: "Domains", icon: Shapes },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/sections", label: "Sections", icon: ClipboardList },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/academic-years", label: "Academic Years", icon: CalendarClock },
  { href: "/exams", label: "Exams", icon: ClipboardList },
  { href: "/timetable", label: "Timetable", icon: CalendarClock },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/students", label: "Students", icon: Users },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/enquiries", label: "Enquiries", icon: Contact2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout.mutateAsync();
    router.replace("/login");
  };

  const activeItem = navItems.find((item) => pathname === item.href);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,#60a5fa22,transparent_30%),radial-gradient(circle_at_80%_20%,#14b8a622,transparent_35%)]" />

      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 border-r border-zinc-200 bg-white/95 p-4 backdrop-blur transition-transform dark:border-zinc-800 dark:bg-zinc-950/95 lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="mb-2 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                <Image src="/logo.png" alt="Ascento Abacus" width={170} height={52} className="h-auto w-auto" />
              </div>
              <h2 className="text-xl font-semibold">Admin Panel</h2>
              <p className="mt-1 text-xs text-zinc-500">Clear modules for daily operations</p>
            </div>
            <button className="lg:hidden" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex w-full flex-col lg:pl-0">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
                  <Menu size={16} />
                </Button>
                <div>
                  <p className="text-sm text-zinc-500">School Administration Workspace</p>
                  <p className="text-xs text-zinc-500">{activeItem ? activeItem.label : "Select a module from the sidebar"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <Button variant="destructive" onClick={doLogout} disabled={logout.isPending}>
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
