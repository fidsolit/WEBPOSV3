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
  receipt_no: string | null;
  status: "saved" | "completed" | "void";
}

interface CustomerCredit {
  id: string;
  customer_name: string;
  amount: number;
  note: string | null;
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
  const [todaySales, setTodaySales] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "cashier">("cashier");
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickSaleAmount, setQuickSaleAmount] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [submittingCredit, setSubmittingCredit] = useState(false);
  const [creditFeatureReady, setCreditFeatureReady] = useState(true);
  const [recentCredits, setRecentCredits] = useState<CustomerCredit[]>([]);

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
      setCurrentUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role === "admin" || profile?.role === "cashier") {
        setUserRole(profile.role);
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
        .select("id, total, created_at, receipt_no, status")
        .order("created_at", { ascending: false });

      // Update States
      if (pCount !== null) setTotalProducts(pCount);
      if (uCount !== null) setTotalUsers(uCount);
      if (lCount !== null) setLowStockCount(lCount);

      if (salesData) {
        setSales(salesData.slice(0, 5)); // Only show last 5 in table
        const completedSales = salesData.filter((s) => s.status === "completed");
        const totalRev = completedSales.reduce(
          (acc, s) => acc + Number(s.total),
          0,
        );
        setRevenue(totalRev);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayCompleted = completedSales.filter(
          (s) => new Date(s.created_at) >= startOfDay,
        );
        setTodaySales(
          todayCompleted.reduce((acc, s) => acc + Number(s.total), 0),
        );
        setTodaySalesCount(todayCompleted.length);
      }

      const { data: creditData, error: creditError } = await supabase
        .from("customer_credits")
        .select("id, customer_name, amount, note, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (creditError) {
        if (creditError.code === "42P01") {
          setCreditFeatureReady(false);
        } else {
          console.error("Failed to fetch customer credits:", creditError.message);
        }
      } else if (creditData) {
        setCreditFeatureReady(true);
        setRecentCredits(creditData as CustomerCredit[]);
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
  const handleAddNewSale = async () => {
    if (!activeBranchId)
      return alert("Error: No branch associated with this sale.");
    const amount = Number(quickSaleAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return alert("Please enter a valid amount greater than 0.");
    }
    setSubmittingSale(true);

    const { error } = await supabase.from("sales").insert([
      {
        total: amount,
        subtotal: amount,
        net_total: amount,
        status: "completed",
        branch_id: activeBranchId,
      },
    ]);

    if (!error) {
      setIsModalOpen(false);
      setQuickSaleAmount("");
      getDashboardData();
    } else {
      alert(error.message);
    }
    setSubmittingSale(false);
  };

  const handleAddCustomerCredit = async () => {
    if (!activeBranchId || !currentUserId) {
      return alert("Missing branch or user context.");
    }
    const amount = Number(creditAmount);
    if (!customerName.trim()) return alert("Customer name is required.");
    if (!Number.isFinite(amount) || amount <= 0) {
      return alert("Please enter a valid credit amount.");
    }

    setSubmittingCredit(true);
    const { error } = await supabase.from("customer_credits").insert([
      {
        customer_name: customerName.trim(),
        amount,
        note: creditNote.trim() || null,
        branch_id: activeBranchId,
        created_by: currentUserId,
      },
    ]);

    if (error) {
      if (error.code === "42P01") {
        alert(
          "Customer credit table is missing. Run the role-and-credit migration first.",
        );
        setCreditFeatureReady(false);
      } else {
        alert(error.message);
      }
      setSubmittingCredit(false);
      return;
    }

    setIsCreditModalOpen(false);
    setCustomerName("");
    setCreditAmount("");
    setCreditNote("");
    setSubmittingCredit(false);
    getDashboardData();
  };

  const handleVoidSale = async (saleId: string) => {
    const confirmed = window.confirm(
      "Void this transaction? Inventory rollback is not yet automated.",
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("sales")
      .update({
        status: "void",
        voided_at: new Date().toISOString(),
      })
      .eq("id", saleId);

    if (error) {
      alert(error.message);
      return;
    }
    getDashboardData();
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
          {creditFeatureReady && (
            <button
              onClick={() => setIsCreditModalOpen(true)}
              className="w-full md:w-auto px-6 py-3 rounded-2xl font-bold bg-amber-500 text-white shadow-xl hover:scale-105 transition-all"
            >
              Add Customer Credit
            </button>
          )}
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            label="Total Revenue"
            value={`₱${revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
          />
          <StatCard
            label="Today's Sales"
            value={`₱${todaySales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
          />
          <StatCard label="Today's Transactions" value={todaySalesCount.toString()} />
          {userRole === "admin" ? (
            <StatCard
              label="Low Stock Alert"
              value={lowStockCount.toString()}
              isAlert={lowStockCount > 0}
            />
          ) : (
            <StatCard label="Total Products" value={totalProducts.toString()} />
          )}
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
                  <th className="px-8 py-4 font-medium">Receipt</th>
                  <th className="px-8 py-4 font-medium">Date</th>
                  <th className="px-8 py-4 font-medium">Total Amount</th>
                  <th className="px-8 py-4 font-medium">Status</th>
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
                        {sale.receipt_no || "-"}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 font-bold text-sm text-emerald-600">
                        ₱{sale.total.toFixed(2)}
                      </td>
                      <td className="px-8 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            sale.status === "void"
                              ? "bg-rose-100 text-rose-700"
                              : sale.status === "saved"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {sale.status !== "void" ? (
                          <button
                            onClick={() => handleVoidSale(sale.id)}
                            className="text-xs font-semibold px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            Void
                          </button>
                        ) : (
                          <MoreVertical
                            size={16}
                            className="ml-auto text-slate-400 inline"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
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

        {creditFeatureReady && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-8">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-lg font-bold">Recent Customer Credit</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm bg-slate-50/50">
                    <th className="px-8 py-4 font-medium">Customer</th>
                    <th className="px-8 py-4 font-medium">Amount</th>
                    <th className="px-8 py-4 font-medium">Note</th>
                    <th className="px-8 py-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentCredits.length > 0 ? (
                    recentCredits.map((credit) => (
                      <tr key={credit.id}>
                        <td className="px-8 py-4 text-sm font-medium">
                          {credit.customer_name}
                        </td>
                        <td className="px-8 py-4 text-sm text-amber-600 font-bold">
                          ₱{Number(credit.amount).toFixed(2)}
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-500">
                          {credit.note || "-"}
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-500">
                          {new Date(credit.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-8 py-10 text-center text-slate-400"
                      >
                        No customer credit records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
                min="0.01"
                step="0.01"
                value={quickSaleAmount}
                onChange={(e) => setQuickSaleAmount(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-2xl font-bold"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddNewSale();
                }}
              />
              <button
                disabled={submittingSale}
                onClick={handleAddNewSale}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
              >
                {submittingSale ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Customer Credit</h2>
              <button
                onClick={() => setIsCreditModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
              />
              <textarea
                placeholder="Note (optional)"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                disabled={submittingCredit}
                onClick={handleAddCustomerCredit}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg"
              >
                {submittingCredit ? "Saving..." : "Save Credit"}
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
