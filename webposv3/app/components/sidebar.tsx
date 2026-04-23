"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  onNewSaleClick?: () => void;
}

export default function Sidebar({ onNewSaleClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/auth/login");
  };

  return (
    <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 p-6 flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-10">
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          P
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          POS<span className="text-blue-600">PRO</span>
        </h1>
      </div>

      {/* Main Nav */}
      <nav className="space-y-1 flex-1">
        <SidebarItem
          href="/pos"
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={pathname === "/pos"}
        />
        <button
          onClick={onNewSaleClick}
          className="flex items-center gap-3 p-3 w-full rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-medium"
        >
          <ShoppingCart size={20} />
          <span className="text-[15px]">New Sale</span>
        </button>
        <SidebarItem
          href="/inventory"
          icon={<Package size={20} />}
          label="Inventory"
          active={pathname === "/inventory"}
        />
        <SidebarItem
          href="/customers"
          icon={<Users size={20} />}
          label="Customers"
          active={pathname === "/customers"}
        />
      </nav>

      {/* Bottom Nav */}
      <div className="pt-6 border-t border-slate-100 space-y-2">
        <SidebarItem
          href="/settings"
          icon={<Settings size={20} />}
          label="Settings"
          active={pathname === "/settings"}
        />
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

function SidebarItem({ href, icon, label, active }: any) {
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
