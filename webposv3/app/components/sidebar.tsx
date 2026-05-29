"use client";

import React from "react";
import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logUserActivity } from "@/lib/activityLogger";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  ChartColumn,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  onNewSaleClick?: () => void;
}

export default function Sidebar({ onNewSaleClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "cashier" | "user" | null>(null);
  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/cashiers") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");
  const effectiveRole = role ?? (isAdminRoute ? "admin" : null);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (
        profile?.role === "admin" ||
        profile?.role === "cashier" ||
        profile?.role === "user"
      ) {
        setRole(profile.role);
      }
    };
    loadRole();
  }, []);

  const handleLogout = async () => {
    await logUserActivity("logout");
    await supabase.auth.signOut();
    router.refresh();
    router.push("/auth/login");
  };

  const handleNewSaleClick = () => {
    if (onNewSaleClick) {
      onNewSaleClick();
      return;
    }

    router.push("/pos");
  };

  return (
    <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 p-6 flex-col h-screen sticky top-0">
      {/* Dynamic Brand SVG Logo Branding Header */}
      <div className="app-sidebar-logo px-2 mb-10 flex items-center justify-start">
        <svg
          viewBox="0 0 540 150"
          className="h-10 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Core Brand Electric Blue Gradient */}
            <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Growth Emerald Green Gradient */}
            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Soft Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* LOGO ICON (POS Terminal + Data Growth) */}
          <g transform="translate(10, 5)">
            {/* Main POS Terminal Body Frame */}
            <path
              d="M20 30 C20 15, 35 0, 50 0 L110 0 C125 0, 140 15, 140 30 L140 120 C140 130, 130 140, 120 140 L40 140 C25 140, 20 125, 20 110 Z"
              fill="url(#blueGrad)"
            />

            {/* Slanted Screen / Receipt Output Slot Area */}
            <path d="M32 15 H128 V65 H32 Z" fill="#1e293b" opacity="0.9" />

            {/* POS Base/Keypad Accent */}
            <rect
              x="42"
              y="90"
              width="18"
              height="12"
              rx="3"
              fill="#ffffff"
              opacity="0.2"
            />
            <rect
              x="71"
              y="90"
              width="18"
              height="12"
              rx="3"
              fill="#ffffff"
              opacity="0.2"
            />
            <rect
              x="100"
              y="90"
              width="18"
              height="12"
              rx="3"
              fill="#ffffff"
              opacity="0.2"
            />
            <rect
              x="42"
              y="112"
              width="47"
              height="12"
              rx="3"
              fill="#ffffff"
              opacity="0.3"
            />
            <rect
              x="100"
              y="112"
              width="18"
              height="12"
              rx="3"
              fill="url(#greenGrad)"
            />

            {/* Overlapping Dynamic Trending Line Chart (The Growth Aspect) */}
            <path
              d="M10 95 L55 50 L90 75 L145 15"
              fill="none"
              stroke="url(#greenGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />

            {/* Data Node Points */}
            <circle cx="55" cy="50" r="7" fill="#ffffff" />
            <circle cx="90" cy="75" r="7" fill="#ffffff" />
            <circle
              cx="145"
              cy="15"
              r="9"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="4"
            />
          </g>

          {/* TYPOGRAPHY SECTION */}
          {/* "pos" text styled inline with your template parameters */}
          <text
            x="185"
            y="105"
            fontFamily="system-ui, sans-serif"
            fontWeight="800"
            fontSize="100"
            fill="currentColor"
            letterSpacing="-3"
          >
            pos
          </text>

          {/* "v3" version indicators */}
          <text
            x="340"
            y="105"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            fontSize="110"
            fill="url(#greenGrad)"
            letterSpacing="-1"
          >
            v3
          </text>

          {/* Clean Subtitle / Application Pitch Divider Line */}
          <line
            x1="190"
            y1="130"
            x2="490"
            y2="130"
            stroke="currentColor"
            opacity="0.22"
            strokeWidth="3"
          />
        </svg>
      </div>

      {/* Main Nav */}
      <nav className="space-y-1 flex-1">
        <SidebarItem
          href={effectiveRole === "admin" ? "/admin" : "/pos"}
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={pathname === "/pos" || pathname === "/admin"}
        />
        <button
          onClick={handleNewSaleClick}
          className="flex items-center gap-3 p-3 w-full rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-medium"
        >
          <ShoppingCart size={20} />
          <span className="text-[15px]">New Sale</span>
        </button>
        <SidebarItem
          href="/customers"
          icon={<Users size={20} />}
          label="Customers"
          active={pathname === "/customers"}
        />
        <SidebarItem
          href="/expenses"
          icon={<Receipt size={20} />}
          label="Expenses"
          active={pathname === "/expenses"}
        />

        {effectiveRole === "admin" && (
          <>
            <SidebarItem
              href="/products"
              icon={<Package size={20} />}
              label="Products"
              active={pathname === "/products"}
            />
            <SidebarItem
              href="/inventory"
              icon={<Package size={20} />}
              label="Inventory"
              active={pathname === "/inventory"}
            />
            <SidebarItem
              href="/cashiers"
              icon={<UserCog size={20} />}
              label="Users"
              active={pathname === "/cashiers"}
            />
            <SidebarItem
              href="/reports"
              icon={<ChartColumn size={20} />}
              label="Reports"
              active={pathname === "/reports"}
            />
          </>
        )}
      </nav>

      {/* Bottom Nav */}
      <div className="pt-6 border-t border-slate-100 space-y-2">
        <ThemeToggle />
        {effectiveRole === "admin" && (
          <SidebarItem
            href="/settings"
            icon={<Settings size={20} />}
            label="Settings"
            active={pathname === "/settings"}
          />
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 w-full rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-medium"
        >
          <LogOut size={20} />
          <span className="text-[15px]">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${
        active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span className="text-[15px]">{label}</span>
    </Link>
  );
}
