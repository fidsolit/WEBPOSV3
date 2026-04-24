"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2, Plus, Search, X } from "lucide-react";
import Sidebar from "../components/sidebar";

// --- Types ---
interface Sale {
  id: string;
  total: number;
  created_at: string;
  receipt_no: string | null;
  status: "saved" | "completed" | "void";
  user_id: string | null;
  profiles:
    | {
        full_name: string | null;
      }
    | {
        full_name: string | null;
      }[]
    | null;
}

interface CustomerCredit {
  id: string;
  customer_name: string;
  contact_number: string | null;
  amount: number;
  note: string | null;
  promise_to_pay_date: string | null;
  is_paid: boolean;
  payment_status: "pending" | "paid" | "overdue";
  created_at: string;
}

interface ProductCatalogItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode: string | null;
}

interface CartItem extends ProductCatalogItem {
  quantity: number;
}

interface InventoryForSale {
  id: string;
  product_id: string;
  stock: number;
}

interface LowStockItem {
  id: string;
  stock: number;
  min_stock: number;
  products: {
    name: string;
    barcode: string | null;
  } | null;
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
  const [submittingSale, setSubmittingSale] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ProductCatalogItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [promiseToPayDate, setPromiseToPayDate] = useState("");
  const [submittingCredit, setSubmittingCredit] = useState(false);
  const [creditFeatureReady, setCreditFeatureReady] = useState(true);
  const [recentCredits, setRecentCredits] = useState<CustomerCredit[]>([]);
  const [dueCreditAlerts, setDueCreditAlerts] = useState<CustomerCredit[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

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

      const { data: lowStockData } = await supabase
        .from("inventory")
        .select(
          `
          id,
          stock,
          min_stock,
          products (
            name,
            barcode
          )
        `,
        )
        .lte("stock", 10)
        .order("stock", { ascending: true })
        .limit(8);

      // Fetch Sales for Revenue Calculation & Table
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, total, created_at, receipt_no, status, user_id, profiles(full_name)")
        .order("created_at", { ascending: false });

      // Update States
      if (pCount !== null) setTotalProducts(pCount);
      if (uCount !== null) setTotalUsers(uCount);
      if (lCount !== null) setLowStockCount(lCount);
      if (lowStockData) {
        const normalizedLowStock = (
          lowStockData as {
            id: string;
            stock: number;
            min_stock: number;
            products:
              | { name: string; barcode: string | null }
              | { name: string; barcode: string | null }[]
              | null;
          }[]
        ).map((row) => ({
          id: row.id,
          stock: row.stock,
          min_stock: row.min_stock,
          products: Array.isArray(row.products)
            ? (row.products[0] ?? null)
            : row.products,
        }));
        setLowStockItems(normalizedLowStock);
      }

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
        .select(
          "id, customer_name, contact_number, amount, note, promise_to_pay_date, is_paid, payment_status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (creditError) {
        if (creditError.code === "42P01" || creditError.code === "42703") {
          setCreditFeatureReady(false);
        } else {
          console.error("Failed to fetch customer credits:", creditError.message);
        }
      } else if (creditData) {
        setCreditFeatureReady(true);
        setRecentCredits(creditData as CustomerCredit[]);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const next7Days = new Date(now);
        next7Days.setDate(next7Days.getDate() + 7);

        const dueSoon = (creditData as CustomerCredit[]).filter((credit) => {
          if (!credit.promise_to_pay_date || credit.is_paid) return false;
          const promiseDate = new Date(credit.promise_to_pay_date);
          return promiseDate >= now && promiseDate <= next7Days;
        });
        setDueCreditAlerts(dueSoon);
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
  const loadCatalogItems = useCallback(async () => {
    if (!activeBranchId) return;
    const { data, error } = await supabase
      .from("inventory")
      .select(
        `
        stock,
        products (
          id,
          name,
          price,
          cost,
          barcode
        )
      `,
      )
      .eq("branch_id", activeBranchId)
      .gt("stock", 0)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed loading catalog:", error.message);
      return;
    }

    const rows = (data ?? []) as {
      stock: number;
      products:
        | {
            id: string;
            name: string;
            price: number;
            cost: number;
            barcode: string | null;
          }
        | {
            id: string;
            name: string;
            price: number;
            cost: number;
            barcode: string | null;
          }[]
        | null;
    }[];

    const items = rows
      .map((row) => (Array.isArray(row.products) ? row.products[0] : row.products))
      .filter((p): p is ProductCatalogItem => Boolean(p));
    setCatalogItems(items);
  }, [activeBranchId]);

  useEffect(() => {
    if (isModalOpen) loadCatalogItems();
  }, [isModalOpen, loadCatalogItems]);

  const addItemToCart = (item: ProductCatalogItem) => {
    setCart((current) => {
      const existing = current.find((c) => c.id === item.id);
      if (existing) {
        return current.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const handleBarcodeAdd = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const matched = catalogItems.find((item) => item.barcode === code);
    if (!matched) {
      alert("Barcode not found in available items.");
      return;
    }
    addItemToCart(matched);
    setBarcodeInput("");
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((current) => current.filter((c) => c.id !== productId));
      return;
    }
    setCart((current) =>
      current.map((c) => (c.id === productId ? { ...c, quantity } : c)),
    );
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  const handleAddNewSale = async () => {
    if (!activeBranchId || !currentUserId) {
      return alert("Missing branch or user context.");
    }
    if (cart.length === 0) {
      return alert("Add at least one item to cart.");
    }

    setSubmittingSale(true);

    const cartProductIds = cart.map((item) => item.id);
    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, product_id, stock")
      .eq("branch_id", activeBranchId)
      .in("product_id", cartProductIds);

    if (inventoryError) {
      alert(inventoryError.message);
      setSubmittingSale(false);
      return;
    }

    const inventoryMap = new Map(
      ((inventoryRows ?? []) as InventoryForSale[]).map((row) => [
        row.product_id,
        row,
      ]),
    );

    for (const item of cart) {
      const inv = inventoryMap.get(item.id);
      if (!inv) {
        alert(`No inventory record found for "${item.name}".`);
        setSubmittingSale(false);
        return;
      }
      if (inv.stock < item.quantity) {
        alert(
          `Insufficient stock for "${item.name}". Available: ${inv.stock}, requested: ${item.quantity}.`,
        );
        setSubmittingSale(false);
        return;
      }
    }

    const receiptNo = `RCPT-${Date.now()}`;
    const { data: saleData, error } = await supabase
      .from("sales")
      .insert([
        {
          total: cartSubtotal,
          subtotal: cartSubtotal,
          net_total: cartSubtotal,
          status: "completed",
          receipt_no: receiptNo,
          branch_id: activeBranchId,
          user_id: currentUserId,
        },
      ])
      .select("id")
      .single();

    if (error || !saleData) {
      alert(error?.message || "Failed creating sale.");
      setSubmittingSale(false);
      return;
    }

    const saleItemsPayload = cart.map((item) => ({
      sale_id: saleData.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      line_subtotal: Number(item.price) * item.quantity,
      net_line_total: Number(item.price) * item.quantity,
      unit_cost: Number(item.cost) || 0,
    }));

    const { error: saleItemsError } = await supabase
      .from("sale_items")
      .insert(saleItemsPayload);

    if (saleItemsError) {
      alert(saleItemsError.message);
      setSubmittingSale(false);
      return;
    }

    const { error: paymentError } = await supabase.from("payments").insert([
      {
        sale_id: saleData.id,
        method: "cash",
        amount: cartSubtotal,
      },
    ]);

    if (paymentError) {
      alert(paymentError.message);
      setSubmittingSale(false);
      return;
    }

    for (const item of cart) {
      const inv = inventoryMap.get(item.id)!;
      const newStock = inv.stock - item.quantity;
      const { error: updateInventoryError } = await supabase
        .from("inventory")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      if (updateInventoryError) {
        alert(
          `Sale created but failed to update stock for "${item.name}": ${updateInventoryError.message}`,
        );
        setSubmittingSale(false);
        return;
      }
    }

    setIsModalOpen(false);
    setCart([]);
    setItemSearch("");
    setBarcodeInput("");
    getDashboardData();
    setSubmittingSale(false);
  };
  const filteredCatalogItems = catalogItems.filter((item) => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q)
    );
  });


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
        contact_number: customerContact.trim() || null,
        amount,
        note: creditNote.trim() || null,
        promise_to_pay_date: promiseToPayDate || null,
        is_paid: false,
        payment_status: "pending",
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
    setCustomerContact("");
    setCreditAmount("");
    setCreditNote("");
    setPromiseToPayDate("");
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
                  <th className="px-8 py-4 font-medium">Cashier</th>
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
                        {(Array.isArray(sale.profiles)
                          ? sale.profiles[0]?.full_name
                          : sale.profiles?.full_name) ||
                          (sale.user_id ? `User ${sale.user_id.slice(0, 8)}` : "-")}
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
                      colSpan={7}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-lg font-bold">Promise-to-Pay Due Alerts</h3>
              <p className="text-sm text-slate-500">
                Credits due today and within 7 days.
              </p>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {dueCreditAlerts.length > 0 ? (
                dueCreditAlerts.map((credit) => (
                  <div
                    key={credit.id}
                    className="border border-amber-100 bg-amber-50 rounded-xl p-3"
                  >
                    <p className="font-semibold text-sm">{credit.customer_name}</p>
                    <p className="text-xs text-slate-600">
                      ₱{Number(credit.amount).toFixed(2)} - due{" "}
                      {credit.promise_to_pay_date
                        ? new Date(credit.promise_to_pay_date).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No upcoming due promises.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-lg font-bold">Low Stock Notifications</h3>
              <p className="text-sm text-slate-500">
                Items currently at low stock level.
              </p>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-rose-100 bg-rose-50 rounded-xl p-3"
                  >
                    <p className="font-semibold text-sm">
                      {item.products?.name || "Unknown item"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Stock: {item.stock} / Threshold: {item.min_stock ?? 10}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No low-stock alerts.</p>
              )}
            </div>
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
                    <th className="px-8 py-4 font-medium">Promise Date</th>
                    <th className="px-8 py-4 font-medium">Status</th>
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
                          {credit.promise_to_pay_date
                            ? new Date(
                                credit.promise_to_pay_date,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-8 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              credit.payment_status === "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : credit.payment_status === "overdue"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {credit.payment_status}
                          </span>
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
                        colSpan={6}
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
          <div className="bg-white rounded-3xl p-6 w-full max-w-5xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">New Sale</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    autoFocus
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search item name or barcode"
                    className="w-full p-3 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode then press Enter"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeAdd();
                    }
                  }}
                />
                <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-xl">
                  {filteredCatalogItems.length > 0 ? (
                    filteredCatalogItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItemToCart(item)}
                        className="w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.barcode || "No barcode"} - ₱
                          {Number(item.price).toFixed(2)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-slate-400">
                      No matching products.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <h3 className="font-bold mb-3">Cart</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg p-3 border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-sm font-bold">
                            ₱{(Number(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            ₱{Number(item.price).toFixed(2)} each
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                              className="h-7 w-7 rounded bg-slate-100"
                            >
                              -
                            </button>
                            <span className="text-sm w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                              className="h-7 w-7 rounded bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">Cart is empty.</p>
                  )}
                </div>
                <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₱{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₱{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <button
                    disabled={submittingSale || cart.length === 0}
                    onClick={handleAddNewSale}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {submittingSale ? "Processing..." : "Complete Sale"}
                  </button>
                </div>
              </div>
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
                placeholder="Contact number (e.g. +639171234567)"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
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
              <div>
                <label className="text-sm font-bold text-slate-500 mb-1 block">
                  Promise to Pay Date (optional)
                </label>
                <input
                  type="date"
                  value={promiseToPayDate}
                  onChange={(e) => setPromiseToPayDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
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
