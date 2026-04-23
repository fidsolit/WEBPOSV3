"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  Store,
  MoreVertical,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";

// --- Types ---
interface Sale {
  id: string;
  total: number;
  created_at: string;
  payments?: { method: string }[];
}

export default function POSDashboard() {
  const router = useRouter();

  // State
  const [sales, setSales] = useState<Sale[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // For New Sale

  // --- Auth Check ---
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [router]);

  // --- Data Fetching ---
  const getDashboardData = useCallback(async () => {
    if (checkingAuth) return;

    setLoading(true);
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`id, total, created_at, payments (method)`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!salesError && salesData) {
      setSales(salesData as unknown as Sale[]);
      const total = salesData.reduce((acc, s) => acc + Number(s.total), 0);
      setRevenue(total);
    }
    setLoading(false);
  }, [checkingAuth]);

  useEffect(() => {
    getDashboardData();
  }, [getDashboardData]);

  // --- Actions ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/auth/login");
  };

  const handleAddNewSale = async (amount: number) => {
    setLoading(true);
    const { error } = await supabase
      .from("sales")
      .insert([{ total: amount }]) // Minimal insert
      .select();

    if (!error) {
      setIsModalOpen(false);
      getDashboardData(); // Refresh list
    } else {
      alert(error.message);
    }
    setLoading(false);
  };

  if (checkingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            POS<span className="text-blue-600">PRO</span>
          </h1>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active
          />
          <NavItem
            icon={<ShoppingCart size={20} />}
            label="New Sale"
            onClick={() => setIsModalOpen(true)}
          />
          <Link href="/inventory">
            <NavItem icon={<Package size={20} />} label="Inventory" />
          </Link>
          <NavItem icon={<Users size={20} />} label="Customers" />
        </nav>

        <div className="pt-6 border-t border-slate-100 space-y-2">
          <NavItem icon={<Settings size={20} />} label="Settings" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-medium"
          >
            <LogOut size={20} />
            <span className="text-[15px]">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-bold">Dashboard Overview</h2>
            <p className="text-slate-500 mt-1">Real-time performance metrics</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-2xl font-bold bg-blue-600 text-white shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> New Sale
          </button>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            label="Total Revenue"
            value={`₱${revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
            trend={+8.1}
          />
          <StatCard label="Active Orders" value="14" trend={+2.4} />
          <StatCard label="Low Stock Items" value="3" trend={-1.2} />
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Recent Transactions</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-50">
                <th className="pb-4 font-medium">ID</th>
                <th className="pb-4 font-medium">Date</th>
                <th className="pb-4 font-medium">Amount (PHP)</th>
                <th className="pb-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 text-sm font-medium">
                    #{sale.id.slice(0, 8)}
                  </td>
                  <td className="py-4 text-sm text-slate-500">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 font-bold text-sm text-emerald-600">
                    ₱{sale.total.toFixed(2)}
                  </td>
                  <td className="py-4 text-right">
                    <MoreVertical
                      size={16}
                      className="ml-auto text-slate-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- NEW SALE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Quick New Sale</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-500 text-sm">
                Enter the total amount for this transaction.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₱
                </span>
                <input
                  autoFocus
                  type="number"
                  placeholder="0.00"
                  className="w-full p-4 pl-8 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-2xl font-bold"
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleAddNewSale(
                        Number((e.target as HTMLInputElement).value),
                      );
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const val = (
                    document.querySelector(
                      'input[type="number"]',
                    ) as HTMLInputElement
                  ).value;
                  handleAddNewSale(Number(val));
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Internal Components ---

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold"
          : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span className="text-[15px]">{label}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: number;
}) {
  const isPositive = trend >= 0;
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
      <p className="text-slate-400 text-sm font-semibold mb-1 uppercase tracking-tight">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <h4 className="text-3xl font-black">{value}</h4>
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}
        >
          {isPositive ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}
          {Math.abs(trend)}%
        </div>
      </div>
    </div>
  );
}
