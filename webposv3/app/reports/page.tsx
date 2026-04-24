"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, LayoutGrid, Loader2 } from "lucide-react";
import Sidebar from "../components/sidebar";
import { supabase } from "@/lib/supabaseClient";

interface SaleRow {
  id: string;
  total: number;
  status: "saved" | "completed" | "void";
  created_at: string;
}

interface SaleItemRow {
  sale_id: string;
  product_id: string | null;
  price?: number | null;
  quantity: number;
  unit_cost: number | null;
  products:
    | { cost: number; name?: string | null }
    | { cost: number; name?: string | null }[]
    | null;
}

interface ProfitMetric {
  label: string;
  revenue: number;
  cogs: number;
  profit: number;
  transactions: number;
}

interface TopSellingItem {
  productId: string;
  name: string;
  quantitySold: number;
  salesAmount: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProfitMetric[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<TopSellingItem[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "graph">("cards");

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/pos");
        return;
      }

      setCheckingAuth(false);
    };

    init();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    const loadReport = async () => {
      setLoading(true);

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(startOfDay);
      const day = startOfWeek.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startOfWeek.setDate(startOfWeek.getDate() + diff);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, total, status, created_at")
        .eq("status", "completed")
        .gte("created_at", startOfYear.toISOString());

      if (salesError) {
        console.error("Failed to load report sales:", salesError.message);
        setLoading(false);
        return;
      }

      const sales = (salesData as SaleRow[]) ?? [];
      const saleIds = sales.map((sale) => sale.id);

      let cogsBySale = new Map<string, number>();

      if (saleIds.length > 0) {
        const { data: saleItemsData, error: saleItemsError } = await supabase
          .from("sale_items")
          .select("sale_id, product_id, quantity, price, unit_cost, products(cost, name)")
          .in("sale_id", saleIds);

        if (saleItemsError) {
          console.error("Failed to load report sale items:", saleItemsError.message);
          setLoading(false);
          return;
        }

        const saleItems = (saleItemsData as SaleItemRow[]) ?? [];
        cogsBySale = saleItems.reduce((acc, item) => {
          const fallbackCost = Array.isArray(item.products)
            ? (item.products[0]?.cost ?? 0)
            : (item.products?.cost ?? 0);
          const unitCost = Number(item.unit_cost ?? fallbackCost ?? 0);
          const lineCogs = Number(item.quantity) * unitCost;
          const current = acc.get(item.sale_id) ?? 0;
          acc.set(item.sale_id, current + lineCogs);
          return acc;
        }, new Map<string, number>());

        const productSales = saleItems.reduce((acc, item) => {
          if (!item.product_id) return acc;
          const resolvedProduct = Array.isArray(item.products)
            ? item.products[0]
            : item.products;
          const name = resolvedProduct?.name?.trim() || "Unknown item";
          const quantitySold = Number(item.quantity || 0);
          const salesAmount = Number(item.price || 0) * quantitySold;
          const existing = acc.get(item.product_id);

          if (existing) {
            existing.quantitySold += quantitySold;
            existing.salesAmount += salesAmount;
            return acc;
          }

          acc.set(item.product_id, {
            productId: item.product_id,
            name,
            quantitySold,
            salesAmount,
          });
          return acc;
        }, new Map<string, TopSellingItem>());

        setTopSellingItems(
          Array.from(productSales.values())
            .sort((a, b) =>
              b.quantitySold === a.quantitySold
                ? b.salesAmount - a.salesAmount
                : b.quantitySold - a.quantitySold,
            )
            .slice(0, 5),
        );
      } else {
        setTopSellingItems([]);
      }

      const computeMetric = (label: string, from: Date): ProfitMetric => {
        const scoped = sales.filter((sale) => new Date(sale.created_at) >= from);
        const revenue = scoped.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
        const cogs = scoped.reduce((sum, sale) => sum + (cogsBySale.get(sale.id) ?? 0), 0);
        return {
          label,
          revenue,
          cogs,
          profit: revenue - cogs,
          transactions: scoped.length,
        };
      };

      setMetrics([
        computeMetric("Daily", startOfDay),
        computeMetric("Weekly", startOfWeek),
        computeMetric("Monthly", startOfMonth),
        computeMetric("Yearly", startOfYear),
      ]);
      setLoading(false);
    };

    loadReport();
  }, [checkingAuth]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }),
    [],
  );

  const highestRevenue = useMemo(
    () => Math.max(...metrics.map((metric) => metric.revenue), 1),
    [metrics],
  );

  const totalProfit = useMemo(
    () => metrics.reduce((sum, metric) => sum + metric.profit, 0),
    [metrics],
  );

  const totalRevenue = useMemo(
    () => metrics.reduce((sum, metric) => sum + metric.revenue, 0),
    [metrics],
  );

  const totalCogs = useMemo(
    () => metrics.reduce((sum, metric) => sum + metric.cogs, 0),
    [metrics],
  );

  if (checkingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profit Reports</h1>
            <p className="text-slate-500 mt-1">
              Professional profit analytics from revenue and unit cost.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-1 inline-flex">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                viewMode === "cards"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LayoutGrid size={16} />
              Card View
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                viewMode === "graph"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart3 size={16} />
              Graph View
            </button>
          </div>
        </header>

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold mt-2 text-slate-900">
                  {currency.format(totalRevenue)}
                </p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total Cost of Goods
                </p>
                <p className="text-2xl font-bold mt-2 text-slate-900">
                  {currency.format(totalCogs)}
                </p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Net Profit
                </p>
                <p
                  className={`text-2xl font-bold mt-2 ${
                    totalProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {currency.format(totalProfit)}
                </p>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Top Selling Items</h2>
                <p className="text-xs text-slate-500">Based on quantity sold</p>
              </div>
              {topSellingItems.length > 0 ? (
                <div className="space-y-3">
                  {topSellingItems.map((item, index) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between border border-slate-100 rounded-2xl px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {index + 1}. {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Sales Amount: {currency.format(item.salesAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">
                          {item.quantitySold} sold
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No sales data yet for top items.</p>
              )}
            </section>

            {viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                  <section
                    key={metric.label}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
                  >
                    <h2 className="text-lg font-bold mb-4">{metric.label}</h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Revenue</span>
                        <span className="font-semibold">
                          {currency.format(metric.revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cost of Goods</span>
                        <span className="font-semibold">
                          {currency.format(metric.cogs)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Transactions</span>
                        <span className="font-semibold">{metric.transactions}</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between">
                        <span className="font-bold">Profit</span>
                        <span
                          className={`font-bold ${
                            metric.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {currency.format(metric.profit)}
                        </span>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-bold mb-5">Profit Graph</h2>
                <div className="space-y-5">
                  {metrics.map((metric) => {
                    const revenueWidth = Math.max(
                      8,
                      (metric.revenue / highestRevenue) * 100,
                    );
                    const cogsWidth = Math.max(6, (metric.cogs / highestRevenue) * 100);
                    const profitBase = Math.abs(metric.profit);
                    const profitWidth = Math.max(
                      6,
                      (profitBase / highestRevenue) * 100,
                    );

                    return (
                      <div key={metric.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{metric.label}</p>
                          <p className="text-xs text-slate-500">
                            {metric.transactions} transactions
                          </p>
                        </div>
                        <div>
                          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${revenueWidth}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Revenue: {currency.format(metric.revenue)}
                          </p>
                        </div>
                        <div>
                          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${cogsWidth}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            COGS: {currency.format(metric.cogs)}
                          </p>
                        </div>
                        <div>
                          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${
                                metric.profit >= 0 ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${profitWidth}%` }}
                            />
                          </div>
                          <p
                            className={`text-xs mt-1 ${
                              metric.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            Profit: {currency.format(metric.profit)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 text-xs text-slate-500 flex flex-wrap gap-4">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                    Revenue
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                    Cost of Goods
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Profit (positive)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                    Profit (negative)
                  </span>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
