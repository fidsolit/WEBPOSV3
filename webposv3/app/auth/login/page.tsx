"use client";

import { useState, useEffect } from "react"; // Added useEffect
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Moon, Sun, ShieldCheck, Loader2 } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Prevent form flicker
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined" ? window.localStorage.getItem("webpos-theme") : null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("webpos-theme", theme);
    }
  }, [theme]);

  // --- Redirect if already logged in ---
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_approved")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "cashier" && profile?.is_approved === false) {
          await supabase.auth.signOut();
          setApprovalMessage(
            "Your cashier account is still pending approval. Please wait for your admin to approve your account before transacting.",
          );
          setApprovalModalOpen(true);
          setIsChecking(false);
          return;
        }
        router.push("/pos");
      } else {
        setIsChecking(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async () => {
    setErrorMessage("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setErrorMessage("Login failed. Please try again.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single();

    if (profile?.role === "cashier" && profile?.is_approved === false) {
      await supabase.auth.signOut();
      setLoading(false);
      setApprovalMessage(
        "Your cashier account is still pending approval. Please wait for your admin to approve your account before transacting.",
      );
      setApprovalModalOpen(true);
      return;
    }

    router.push("/pos");
  };

  // While checking session, show a clean background or loader
  if (isChecking) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "dark" ? "bg-slate-950" : "bg-slate-100"
        }`}
      >
        <Loader2
          className={`h-8 w-8 animate-spin ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative p-4 ${
        theme === "dark"
          ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
          : "bg-gradient-to-b from-slate-100 via-white to-slate-100"
      }`}
    >
      <button
        onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        className={`absolute top-5 right-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition ${
          theme === "dark"
            ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>

      <div
        className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-100 text-slate-900"
        }`}
      >
        <div className="text-center mb-7">
          <div
            className={`h-12 w-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
              theme === "dark" ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-600"
            }`}
          >
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">WebPOS V3</h1>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            Secure sign-in to your dashboard
          </p>
        </div>

        {errorMessage && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              theme === "dark"
                ? "bg-rose-500/10 text-rose-200 border border-rose-500/20"
                : "bg-rose-50 text-rose-700 border border-rose-100"
            }`}
          >
            {errorMessage}
          </div>
        )}

        <div className="mb-4">
          <label
            className={`text-sm font-medium ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Email
          </label>
          <input
            type="email"
            className={`w-full mt-1 p-3 rounded-xl outline-none border focus:ring-2 ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-slate-100 focus:ring-blue-500/50"
                : "bg-white border-slate-200 text-slate-900 focus:ring-blue-200"
            }`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label
            className={`text-sm font-medium ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Password
          </label>
          <input
            type="password"
            className={`w-full mt-1 p-3 rounded-xl outline-none border focus:ring-2 ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-slate-100 focus:ring-blue-500/50"
                : "bg-white border-slate-200 text-slate-900 focus:ring-blue-200"
            }`}
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p
          className={`text-xs text-center mt-4 ${
            theme === "dark" ? "text-slate-500" : "text-slate-400"
          }`}
        >
          POS System - Secure Login
        </p>
        <div className="text-center mt-4">
          <Link
            href="/auth/register"
            className={`text-sm font-semibold hover:underline ${
              theme === "dark" ? "text-blue-300" : "text-blue-600"
            }`}
          >
            Do not have an account? Sign up here
          </Link>
        </div>
      </div>

      {approvalModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-100"
            }`}
          >
            <div
              className={`px-6 py-5 border-b ${
                theme === "dark" ? "border-slate-700" : "border-slate-100"
              }`}
            >
              <h2
                className={`text-lg font-bold ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                Approval Required
              </h2>
              <p
                className={`text-sm mt-1 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Cashier account verification
              </p>
            </div>
            <div className="px-6 py-5">
              <p
                className={`text-sm leading-relaxed ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {approvalMessage}
              </p>
            </div>
            <div
              className={`px-6 py-4 flex justify-end ${
                theme === "dark" ? "bg-slate-800" : "bg-slate-50"
              }`}
            >
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
