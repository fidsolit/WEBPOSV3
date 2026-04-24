"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
  quantity: number;
  unit_cost: number | null;
  products: { cost: number } | { cost: number }[] | null;
}

interface ProfitMetric {
  label: string;
  revenue: number;
  cogs: number;
  profit: number;
  transactions: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProfitMetric[]>([]);

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
          .select("sale_id, quantity, unit_cost, products(cost)")
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
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Profit Reports</h1>
          <p className="text-slate-500 mt-1">
            Profit based on sales and recorded unit cost.
          </p>
        </header>

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
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
                    <span className="font-semibold">{currency.format(metric.cogs)}</span>
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
        )}
      </main>
    </div>
  );
}
