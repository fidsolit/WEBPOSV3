"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Plus, Search, X } from "lucide-react";
import Sidebar from "../components/sidebar";
import { supabase } from "@/lib/supabaseClient";

interface CustomerCreditRow {
  id: string;
  customer_name: string;
  contact_number: string | null;
  amount: number;
  promise_to_pay_date: string | null;
  is_paid: boolean;
  payment_status: "pending" | "paid" | "overdue";
}

interface CustomerSummary {
  key: string;
  customer_name: string;
  contact_number: string | null;
  to_pay_amount: number;
  unpaid_count: number;
  next_due_date: string | null;
}

interface RegisteredCustomer {
  id: string;
  full_name: string;
  contact_number: string | null;
  notes: string | null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [smsLoadingKey, setSmsLoadingKey] = useState<string | null>(null);
  const [paidLoadingKey, setPaidLoadingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CustomerCreditRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerFeatureReady, setCustomerFeatureReady] = useState(true);
  const [registeredCustomers, setRegisteredCustomers] = useState<
    RegisteredCustomer[]
  >([]);
  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    contactNumber: "",
    notes: "",
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, branch_id")
        .eq("id", user.id)
        .single();

      let resolvedBranchId = profile?.branch_id ?? null;
      if (!resolvedBranchId) {
        const { data: branch } = await supabase
          .from("branches")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        resolvedBranchId = branch?.id ?? null;
      }

      setActiveBranchId(resolvedBranchId);
      setCheckingAuth(false);
      await loadCustomerCredits();
      await loadRegisteredCustomers(resolvedBranchId);
    };
    init();
  }, [router]);

  const loadCustomerCredits = async () => {
    setLoading(true);
    await syncOverdueStatuses();
    const { data, error } = await supabase
      .from("customer_credits")
      .select(
        "id, customer_name, contact_number, amount, promise_to_pay_date, is_paid, payment_status",
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setRows((data as CustomerCreditRow[]) ?? []);
    }
    setLoading(false);
  };

  const loadRegisteredCustomers = async (branchId: string | null) => {
    if (!branchId) return;
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, contact_number, notes")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      if (error.code === "42P01") {
        setCustomerFeatureReady(false);
        return;
      }
      alert(error.message);
      return;
    }
    setCustomerFeatureReady(true);
    setRegisteredCustomers((data as RegisteredCustomer[]) ?? []);
  };

  const syncOverdueStatuses = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("customer_credits")
      .update({ payment_status: "overdue" })
      .eq("is_paid", false)
      .lt("promise_to_pay_date", today)
      .neq("payment_status", "overdue");
  };

  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    for (const row of rows) {
      const key = `${row.customer_name}::${row.contact_number || "-"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          customer_name: row.customer_name,
          contact_number: row.contact_number,
          to_pay_amount: 0,
          unpaid_count: 0,
          next_due_date: null,
        });
      }
      const target = map.get(key)!;
      if (!row.is_paid && row.payment_status !== "paid") {
        target.to_pay_amount += Number(row.amount);
        target.unpaid_count += 1;
        if (
          row.promise_to_pay_date &&
          (!target.next_due_date || row.promise_to_pay_date < target.next_due_date)
        ) {
          target.next_due_date = row.promise_to_pay_date;
        }
      }
    }
    const query = search.trim().toLowerCase();
    return [...map.values()]
      .filter((c) => c.to_pay_amount > 0)
      .filter((c) => {
        if (!query) return true;
        return (
          c.customer_name.toLowerCase().includes(query) ||
          c.contact_number?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.to_pay_amount - a.to_pay_amount);
  }, [rows, search]);

  const sendSmsReminder = async (customer: CustomerSummary) => {
    if (!customer.contact_number) {
      alert("Customer has no contact number.");
      return;
    }
    setSmsLoadingKey(customer.key);
    const res = await fetch("/api/sms/reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: customer.contact_number,
        customerName: customer.customer_name,
        amount: customer.to_pay_amount,
        dueDate: customer.next_due_date,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Failed to send SMS");
    } else {
      alert("SMS reminder sent.");
    }
    setSmsLoadingKey(null);
  };

  const markCustomerAsPaid = async (customer: CustomerSummary) => {
    const confirmed = window.confirm(
      `Mark all unpaid credit of ${customer.customer_name} as paid?`,
    );
    if (!confirmed) return;

    setPaidLoadingKey(customer.key);
    let query = supabase
      .from("customer_credits")
      .update({ is_paid: true, payment_status: "paid" })
      .eq("customer_name", customer.customer_name)
      .eq("is_paid", false);

    query =
      customer.contact_number === null
        ? query.is("contact_number", null)
        : query.eq("contact_number", customer.contact_number);

    const { error } = await query;
    if (error) {
      alert(error.message);
    } else {
      await loadCustomerCredits();
    }
    setPaidLoadingKey(null);
  };

  const handleAddCustomer = async () => {
    if (!currentUserId) return alert("Missing user context.");

    let branchId = activeBranchId;
    if (!branchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      branchId = branch?.id ?? null;
      if (branchId) setActiveBranchId(branchId);
    }
    if (!branchId) return alert("No branch found. Please create a branch first.");

    if (!newCustomer.fullName.trim()) {
      return alert("Customer name is required.");
    }
    const { error } = await supabase.from("customers").insert([
      {
        full_name: newCustomer.fullName.trim(),
        contact_number: newCustomer.contactNumber.trim() || null,
        notes: newCustomer.notes.trim() || null,
        branch_id: branchId,
        created_by: currentUserId,
      },
    ]);
    if (error) {
      if (error.code === "42P01") {
        setCustomerFeatureReady(false);
        return alert(
          "Customers table missing. Run phase1_customer_registry_upgrade.sql.",
        );
      }
      alert(error.message);
      return;
    }
    setIsAddCustomerOpen(false);
    setNewCustomer({ fullName: "", contactNumber: "", notes: "" });
    await loadRegisteredCustomers(branchId);
  };

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="text-slate-500 mt-1">
                Track unpaid customer credit and send reminders.
              </p>
            </div>
            {customerFeatureReady && (
              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Add Customer
              </button>
            )}
          </div>
        </header>

        {customerFeatureReady && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold">Latest Registered Customers</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registeredCustomers.length > 0 ? (
                registeredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border border-slate-100 rounded-2xl p-4 bg-slate-50"
                  >
                    <p className="font-semibold">{customer.full_name}</p>
                    <p className="text-sm text-slate-500">
                      {customer.contact_number || "No contact"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {customer.notes || "No notes"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No registered customers yet.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or contact..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/60 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact Number</th>
                  <th className="px-6 py-4">To Pay Amount</th>
                  <th className="px-6 py-4">Unpaid Entries</th>
                  <th className="px-6 py-4">Next Due</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No customers with unpaid credit.
                    </td>
                  </tr>
                )}
                {customers.map((customer) => (
                  <tr key={customer.key} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-semibold">{customer.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.contact_number || "-"}
                    </td>
                    <td className="px-6 py-4 font-bold text-amber-600">
                      ₱{customer.to_pay_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">{customer.unpaid_count}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.next_due_date
                        ? new Date(customer.next_due_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          disabled={
                            paidLoadingKey === customer.key ||
                            smsLoadingKey === customer.key
                          }
                          onClick={() => markCustomerAsPaid(customer)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {paidLoadingKey === customer.key ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : null}
                          Mark Paid
                        </button>
                        <button
                          disabled={
                            smsLoadingKey === customer.key ||
                            !customer.contact_number ||
                            paidLoadingKey === customer.key
                          }
                          onClick={() => sendSmsReminder(customer)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {smsLoadingKey === customer.key ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MessageSquare size={14} />
                          )}
                          Send SMS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddCustomerOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">New Customer</h2>
                <button
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  placeholder="Full name"
                  value={newCustomer.fullName}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, fullName: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                />
                <input
                  placeholder="Contact number"
                  value={newCustomer.contactNumber}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      contactNumber: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={newCustomer.notes}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, notes: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                />
                <button
                  onClick={handleAddCustomer}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold"
                >
                  Save Customer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

