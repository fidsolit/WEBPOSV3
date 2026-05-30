"use client";
import { KeyboardEvent } from "react";

import { useState, useEffect, useSyncExternalStore } from "react"; // Added useEffect
import { supabase } from "@/lib/supabaseClient";
import { logUserActivity } from "@/lib/activityLogger";
import { applyTheme, resolvePreferredTheme } from "@/lib/theme";
import { getAuthRedirectURL } from "@/lib/authRedirect";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Moon, Sun, Loader2 } from "lucide-react";

export default function Login() {
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Prevent form flicker
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "light" : resolvePreferredTheme(),
  );
  const expiredReasonMessage =
    searchParams.get("reason") === "expired"
      ? "Your session expired due to inactivity. Please sign in again."
      : "";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  //handle enter key press
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevents default form submission if inside a form
      handleLogin();
      // Trigger your search or navigation logic here
    }
  };

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
        router.push(profile?.role === "admin" ? "/admin" : "/pos");
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

    await logUserActivity("login");
    router.push(profile?.role === "admin" ? "/admin" : "/pos");
  };

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectURL("/auth/login"),
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setGoogleLoading(false);
    }
  };

  // While checking session, show a clean background or loader
  if (isChecking) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isMounted && theme === "dark" ? "bg-slate-950" : "bg-slate-100"
        }`}
      >
        <Loader2
          className={`h-8 w-8 animate-spin ${
            isMounted && theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative p-4 ${
        isMounted && theme === "dark"
          ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
          : "bg-gradient-to-b from-slate-100 via-white to-slate-100"
      }`}
    >
      <button
        onClick={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
        className={`absolute top-5 right-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition ${
          isMounted && theme === "dark"
            ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {isMounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        {isMounted && theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>

      <div
        className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl ${
          isMounted && theme === "dark"
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-100 text-slate-900"
        }`}
      >
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <svg
              viewBox="0 0 540 150"
              className={`h-16 w-auto ${
                isMounted && theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="loginBlueGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>

                <linearGradient
                  id="loginGreenGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                <filter
                  id="loginGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <g transform="translate(10, 5)">
                <path
                  d="M20 30 C20 15, 35 0, 50 0 L110 0 C125 0, 140 15, 140 30 L140 120 C140 130, 130 140, 120 140 L40 140 C25 140, 20 125, 20 110 Z"
                  fill="url(#loginBlueGrad)"
                />

                <path d="M32 15 H128 V65 H32 Z" fill="#1e293b" opacity="0.9" />

                <rect
                  x="42"
                  y="90"
                  width="18"
                  height="12"
                  rx="3"
                  fill="#ffffff"
                  opacity="0.2"
                />
                <rect
                  x="71"
                  y="90"
                  width="18"
                  height="12"
                  rx="3"
                  fill="#ffffff"
                  opacity="0.2"
                />
                <rect
                  x="100"
                  y="90"
                  width="18"
                  height="12"
                  rx="3"
                  fill="#ffffff"
                  opacity="0.2"
                />
                <rect
                  x="42"
                  y="112"
                  width="47"
                  height="12"
                  rx="3"
                  fill="#ffffff"
                  opacity="0.3"
                />
                <rect
                  x="100"
                  y="112"
                  width="18"
                  height="12"
                  rx="3"
                  fill="url(#loginGreenGrad)"
                />

                <path
                  d="M10 95 L55 50 L90 75 L145 15"
                  fill="none"
                  stroke="url(#loginGreenGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#loginGlow)"
                />

                <circle cx="55" cy="50" r="7" fill="#ffffff" />
                <circle cx="90" cy="75" r="7" fill="#ffffff" />
                <circle
                  cx="145"
                  cy="15"
                  r="9"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="4"
                />
              </g>

              <text
                x="185"
                y="105"
                fontFamily="system-ui, sans-serif"
                fontWeight="800"
                fontSize="100"
                fill="currentColor"
                letterSpacing="-3"
              >
                pos
              </text>

              <text
                x="340"
                y="105"
                fontFamily="system-ui, sans-serif"
                fontWeight="900"
                fontSize="110"
                fill="url(#loginGreenGrad)"
                letterSpacing="-1"
              >
                v3
              </text>

              <line
                x1="190"
                y1="130"
                x2="490"
                y2="130"
                stroke="currentColor"
                opacity="0.22"
                strokeWidth="3"
              />
            </svg>
          </div>

          <p
            className={`text-sm mt-1 ${
              isMounted && theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Secure sign-in to your dashboard
          </p>
        </div>
        {(errorMessage || expiredReasonMessage) && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              isMounted && theme === "dark"
                ? "bg-rose-500/10 text-rose-200 border border-rose-500/20"
                : "bg-rose-50 text-rose-700 border border-rose-100"
            }`}
          >
            {errorMessage || expiredReasonMessage}
          </div>
        )}

        <div className="mb-4">
          <label
            className={`text-sm font-medium ${
              isMounted && theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Email
          </label>
          <input
            type="email"
            className={`w-full mt-1 p-3 rounded-xl outline-none border focus:ring-2 ${
              isMounted && theme === "dark"
                ? "bg-slate-800 border-slate-700 text-slate-100 focus:ring-blue-500/50"
                : "bg-white border-slate-200 text-slate-900 focus:ring-blue-200"
            }`}
            placeholder="you@gmail.com"
            value={email}
            onKeyDown={handleKeyDown}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label
            className={`text-sm font-medium ${
              isMounted && theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Password
          </label>
          <input
            type="password"
            onKeyDown={handleKeyDown}
            className={`w-full mt-1 p-3 rounded-xl outline-none border focus:ring-2 ${
              isMounted && theme === "dark"
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
          disabled={loading || googleLoading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div
            className={`h-px flex-1 ${
              isMounted && theme === "dark" ? "bg-slate-700" : "bg-slate-200"
            }`}
          />
          <span
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${
              isMounted && theme === "dark" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Or
          </span>
          <div
            className={`h-px flex-1 ${
              isMounted && theme === "dark" ? "bg-slate-700" : "bg-slate-200"
            }`}
          />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className={`w-full rounded-xl border px-4 py-3 font-semibold transition disabled:opacity-50 ${
            isMounted && theme === "dark"
              ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
              : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center justify-center gap-3">
            <GoogleIcon />
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </span>
        </button>

        <p
          className={`text-xs text-center mt-4 ${
            isMounted && theme === "dark" ? "text-slate-500" : "text-slate-400"
          }`}
        >
          POS System - Secure Login
        </p>
        <div className="text-center mt-4">
          <Link
            href="/auth/register"
            className={`text-sm font-semibold hover:underline ${
              isMounted && theme === "dark" ? "text-blue-300" : "text-blue-600"
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
              isMounted && theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-100"
            }`}
          >
            <div
              className={`px-6 py-5 border-b ${
                isMounted && theme === "dark"
                  ? "border-slate-700"
                  : "border-slate-100"
              }`}
            >
              <h2
                className={`text-lg font-bold ${
                  isMounted && theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                Approval Required
              </h2>
              <p
                className={`text-sm mt-1 ${
                  isMounted && theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Cashier account verification
              </p>
            </div>
            <div className="px-6 py-5">
              <p
                className={`text-sm leading-relaxed ${
                  isMounted && theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {approvalMessage}
              </p>
            </div>
            <div
              className={`px-6 py-4 flex justify-end ${
                isMounted && theme === "dark" ? "bg-slate-800" : "bg-slate-50"
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M21.805 12.023c0-.79-.064-1.364-.202-1.96H12.24v3.71h5.497c-.11.922-.706 2.31-2.03 3.243l-.019.124 2.966 2.252.206.02c1.892-1.716 2.945-4.243 2.945-7.389Z"
        fill="#4285F4"
      />
      <path
        d="M12.24 21.75c2.692 0 4.95-.869 6.6-2.36l-3.153-2.396c-.844.575-1.977.976-3.447.976-2.637 0-4.875-1.716-5.67-4.088l-.119.01-3.084 2.339-.041.112c1.64 3.18 5 5.407 8.914 5.407Z"
        fill="#34A853"
      />
      <path
        d="M6.57 13.882a5.776 5.776 0 0 1-.332-1.882c0-.656.12-1.291.322-1.882l-.006-.126-3.123-2.376-.102.047A9.652 9.652 0 0 0 2.22 12c0 1.56.377 3.037 1.048 4.337l3.302-2.455Z"
        fill="#FBBC05"
      />
      <path
        d="M12.24 6.03c1.854 0 3.104.79 3.816 1.45l2.786-2.67C17.18 3.25 14.933 2.25 12.24 2.25c-3.914 0-7.274 2.228-8.912 5.413l3.23 2.454c.805-2.37 3.043-4.087 5.682-4.087Z"
        fill="#EB4335"
      />
    </svg>
  );
}
