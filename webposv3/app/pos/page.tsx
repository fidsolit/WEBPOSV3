"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2, Plus, X } from "lucide-react";
import Sidebar from "../components/sidebar";

// --- Types ---
interface Sale {
  id: string;
  total: number;
  created_at: string;
}

export default function POSDashboard() {
  const router = useRouter();

  // --- States ---
  const [sales, setSales] = useState<Sale[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. Auth & Initial Data ---
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      // Fetch a valid branch ID for new sales
      const { data: branch } = await supabase
        .from("branches")
        .select("id")
        .limit(1)
        .single();
      if (branch) setActiveBranchId(branch.id);

      setCheckingAuth(false);
    };
    init();
  }, [router]);

  // --- 2. Fetch All Dashboard Metrics ---
  const getDashboardData = useCallback(async () => {
    if (checkingAuth) return;
    setLoading(true);

    try {
      // Fetch Total Products Count
      const { count: pCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Fetch Total Users Count (from profiles table)
      const { count: uCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch Low Stock Count (Items < 10)
      const { count: lCount } = await supabase
        .from("inventory")
        .select("*", { count: "exact", head: true })
        .lt("stock", 10);

      // Fetch Sales for Revenue Calculation & Table
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .order("created_at", { ascending: false });

      // Update States
      if (pCount !== null) setTotalProducts(pCount);
      if (uCount !== null) setTotalUsers(uCount);
      if (lCount !== null) setLowStockCount(lCount);

      if (salesData) {
        setSales(salesData.slice(0, 5)); // Only show last 5 in table
        const totalRev = salesData.reduce((acc, s) => acc + Number(s.total), 0);
        setRevenue(totalRev);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [checkingAuth]);

  useEffect(() => {
    getDashboardData();
  }, [getDashboardData]);

  // --- 3. Actions ---
  const handleAddNewSale = async (amount: number) => {
    if (!activeBranchId)
      return alert("Error: No branch associated with this sale.");
    setLoading(true);

    const { error } = await supabase.from("sales").insert([
      {
        total: amount,
        branch_id: activeBranchId,
      },
    ]);

    if (!error) {
      setIsModalOpen(false);
      getDashboardData();
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
      <Sidebar onNewSaleClick={() => setIsModalOpen(true)} />

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold">Dashboard Overview</h2>
            <p className="text-slate-500 mt-1">Real-time performance metrics</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-6 py-3 rounded-2xl font-bold bg-blue-600 text-white shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} /> New Sale
          </button>
        </header>

        {/* Stats Grid - 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            label="Total Revenue"
            value={`₱${revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
          />
          <StatCard label="Total Products" value={totalProducts.toString()} />
          <StatCard label="Total Users" value={totalUsers.toString()} />
          <StatCard
            label="Low Stock Alert"
            value={lowStockCount.toString()}
            isAlert={lowStockCount > 0}
          />
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-sm bg-slate-50/50">
                  <th className="px-8 py-4 font-medium">Sale ID</th>
                  <th className="px-8 py-4 font-medium">Date</th>
                  <th className="px-8 py-4 font-medium">Total Amount</th>
                  <th className="px-8 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-4 text-sm font-medium">
                        #{sale.id.slice(0, 8)}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 font-bold text-sm text-emerald-600">
                        ₱{sale.total.toFixed(2)}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <MoreVertical
                          size={16}
                          className="ml-auto text-slate-400 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-10 text-center text-slate-400"
                    >
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- NEW SALE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <input
                autoFocus
                type="number"
                placeholder="₱ 0.00"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-2xl font-bold"
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleAddNewSale(
                      Number((e.target as HTMLInputElement).value),
                    );
                }}
              />
              <button
                onClick={() => {
                  const val = (
                    document.querySelector(
                      'input[type="number"]',
                    ) as HTMLInputElement
                  ).value;
                  handleAddNewSale(Number(val));
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
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

// --- Helper Components ---
function StatCard({
  label,
  value,
  isAlert = false,
}: {
  label: string;
  value: string;
  isAlert?: boolean;
}) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
      <p className="text-slate-500 text-sm mb-1 font-medium">{label}</p>
      <p
        className={`text-2xl md:text-3xl font-bold ${isAlert ? "text-red-500" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
