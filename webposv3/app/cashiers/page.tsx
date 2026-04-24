"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search, Shield, UserCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "../components/sidebar";

type Role = "admin" | "cashier";

interface Branch {
  id: string;
  name: string;
}

interface CashierProfile {
  id: string;
  full_name: string | null;
  role: Role;
  is_approved: boolean;
  branch_id: string | null;
  created_at: string;
}

interface CashierRow extends CashierProfile {
  branchName: string;
}

export default function CashiersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const [profiles, setProfiles] = useState<CashierProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: branchData, error: branchError }, { data: profileData, error: profileError }] =
      await Promise.all([
        supabase.from("branches").select("id, name").order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, role, is_approved, branch_id, created_at")
          .order("created_at", { ascending: false }),
      ]);

    if (branchError) console.error("Failed to fetch branches:", branchError.message);
    if (profileError) console.error("Failed to fetch profiles:", profileError.message);

    setBranches((branchData as Branch[]) ?? []);
    setProfiles((profileData as CashierProfile[]) ?? []);
    setLoading(false);
  }, []);

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
      await loadData();
    };
    init();
  }, [router, loadData]);

  const branchMap = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  const rows = useMemo(() => {
    return profiles
      .map((profile) => ({
        ...profile,
        branchName: profile.branch_id ? branchMap.get(profile.branch_id) || "Unknown branch" : "Unassigned",
      }))
      .filter((profile) => {
        const matchesRole = roleFilter === "all" || profile.role === roleFilter;
        const q = query.trim().toLowerCase();
        if (!q) return matchesRole;
        return (
          matchesRole &&
          (profile.full_name?.toLowerCase().includes(q) ||
            profile.id.toLowerCase().includes(q) ||
            profile.branchName.toLowerCase().includes(q))
        );
      });
  }, [profiles, branchMap, query, roleFilter]);

  const updateProfile = async (id: string, patch: Partial<CashierProfile>) => {
    setSaving(id);
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) {
      alert(error.message);
      setSaving(null);
      return;
    }

    setProfiles((current) =>
      current.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)),
    );
    setSaving(null);
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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Cashier Management</h1>
            <p className="text-slate-500 mt-1">Manage cashier roles and branch assignments.</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            Refresh
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatTile label="Total Staff" value={profiles.length.toString()} icon={<UserCircle2 size={18} />} />
          <StatTile
            label="Admins"
            value={profiles.filter((p) => p.role === "admin").length.toString()}
            icon={<Shield size={18} />}
          />
          <StatTile
            label="Cashiers"
            value={profiles.filter((p) => p.role === "cashier").length.toString()}
            icon={<UserCircle2 size={18} />}
          />
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatTile
            label="Approved Cashiers"
            value={profiles
              .filter((p) => p.role === "cashier" && p.is_approved)
              .length.toString()}
            icon={<Shield size={18} />}
          />
          <StatTile
            label="Pending Approval"
            value={profiles
              .filter((p) => p.role === "cashier" && !p.is_approved)
              .length.toString()}
            icon={<UserCircle2 size={18} />}
          />
        </section>

        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ID, or branch..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | Role)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/60 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Approval</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No cashiers found.
                    </td>
                  </tr>
                )}
                {rows.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold">{profile.full_name || "No name"}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {profile.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={profile.role}
                        disabled={saving === profile.id}
                        onChange={(e) =>
                          updateProfile(profile.id, {
                            role: e.target.value as Role,
                          })
                        }
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="cashier">cashier</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {profile.role === "cashier" ? (
                        <button
                          disabled={saving === profile.id}
                          onClick={() =>
                            updateProfile(profile.id, {
                              is_approved: !profile.is_approved,
                            })
                          }
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                            profile.is_approved
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {profile.is_approved ? "Approved" : "Approve"}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={profile.branch_id || ""}
                        disabled={saving === profile.id}
                        onChange={(e) =>
                          updateProfile(profile.id, {
                            branch_id: e.target.value || null,
                          })
                        }
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Unassigned</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

