"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  ShoppingCart,
  BarChart3,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    href: "/dashboard/registros",
    label: "Registros",
    icon: ClipboardList,
    roles: ["admin", "seller"],
  },
  {
    href: "/dashboard/inventario",
    label: "Inventario",
    icon: Package,
    roles: ["admin", "seller"],
  },
  {
    href: "/dashboard/ventas",
    label: "Ventas",
    icon: ShoppingCart,
    roles: ["admin", "seller"],
  },
  {
    href: "/dashboard/reportes",
    label: "Reportes",
    icon: BarChart3,
    roles: ["admin", "seller"],
  },
];

interface Props {
  children: React.ReactNode;
  userName: string;
  role: string;
}

// ─── Sub-components defined outside to avoid remount on each render ──────────

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={[
              "flex items-center gap-3 px-3 py-2.5 min-h-[44px] lg:min-h-0 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-[#F1DAE7]/10 text-[#F1DAE7]"
                : "text-white/50 hover:text-white hover:bg-white/6",
            ].join(" ")}
          >
            <item.icon
              size={18}
              strokeWidth={active ? 2 : 1.75}
              className={active ? "text-[#F1DAE7]" : "text-white/40"}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ userName }: { userName: string }) {
  return (
    <div className="border-t border-white/8 shrink-0 px-5 py-4 space-y-3">
      <p className="text-sm font-medium text-white truncate min-w-0">{userName}</p>
      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-2 min-h-[44px] lg:min-h-0 text-sm text-white/40 hover:text-white transition-colors"
        >
          <LogOut size={15} strokeWidth={1.75} />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function LeafLogo() {
  return (
    <span className="font-semibold text-white tracking-tight text-lg md:text-[15px]">
      Nativa Hub
    </span>
  );
}

// ─── Full-screen nav — mobile only (below md) ────────────────────────────────

function MobileFullscreenNav({
  items,
  pathname,
  userName,
  onClose,
}: {
  items: NavItem[];
  pathname: string;
  userName: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className={[
        "md:hidden fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#0a0a0a] flex flex-col",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/8 shrink-0">
        <span className="font-semibold text-white tracking-tight text-lg">Nativa Hub</span>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 flex flex-col justify-start px-5 pt-3 gap-1">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "flex items-center gap-4 px-4 py-4 rounded-xl text-[18px] font-medium transition-colors",
                active
                  ? "bg-[#F1DAE7]/10 text-[#F1DAE7]"
                  : "text-white/60 hover:text-white hover:bg-white/8",
              ].join(" ")}
            >
              <item.icon
                size={18}
                strokeWidth={active ? 2 : 1.75}
                className={active ? "text-[#F1DAE7]" : "text-white/40"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/8 px-5 py-6">
        <p className="text-lg font-medium text-white mb-4">{userName}</p>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 min-h-[44px] text-base text-white/40 hover:text-white transition-colors"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function SidebarLayout({ children, userName, role }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex h-dvh bg-[#101010] overflow-hidden">
      {/* ── Desktop sidebar (flex child, takes its own width) ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#141414] border-r border-white/8">
        {/* Logo header */}
        <div className="flex items-center px-5 h-16 border-b border-white/8 shrink-0">
          <LeafLogo />
        </div>

        <NavLinks items={visibleNav} pathname={pathname} />
        <UserFooter userName={userName} />
      </aside>

      {/* ── Main content column ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-white/8 bg-[#141414] shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-1 rounded-md min-h-[44px] min-w-[44px] text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} className="w-6 h-6 md:w-5 md:h-5" />
          </button>
          <LeafLogo />
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile full-screen nav ── */}
      {mobileOpen && (
        <MobileFullscreenNav
          items={visibleNav}
          pathname={pathname}
          userName={userName}
          onClose={() => setMobileOpen(false)}
        />
      )}

      {/* ── Tablet overlay ── */}
      {mobileOpen && (
        <div
          className="hidden md:block lg:hidden fixed top-0 left-0 right-0 bottom-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Tablet drawer ── */}
      <aside
        className={[
          "hidden md:flex lg:hidden fixed top-0 bottom-0 left-0 z-50 flex-col w-64 bg-[#141414] border-r border-white/8",
          "transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Menú de navegación"
      >
        {/* Drawer header with close button */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/8 shrink-0">
          <LeafLogo />
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md min-h-[44px] min-w-[44px] text-white/50 hover:text-white hover:bg-white/8 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <NavLinks
          items={visibleNav}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
        <UserFooter userName={userName} />
      </aside>
    </div>
  );
}
