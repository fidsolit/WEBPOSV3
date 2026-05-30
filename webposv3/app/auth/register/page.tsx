"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getAuthRedirectURL } from "@/lib/authRedirect";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailValid) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split("@")[0],
          },
        },
      });

      if (signUpError) {
        // Direct catch for already registered error
        if (signUpError.message.includes("already registered")) {
          setError("This email is already in use. Try logging in!");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Check if user exists but session is null (Supabase security behavior)
      if (data?.user && data.user.identities?.length === 0) {
        setError("This email is already registered. Please login.");
        return;
      }

      if (data?.session) {
        await supabase.auth.signOut();
        router.push("/auth/login");
      } else {
        router.push("/auth/login");
      }
    } catch {
      setError("An unexpected connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleLoading(true);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectURL("/auth/login"),
      },
    });

    if (googleError) {
      setError(googleError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Create Account
          </h1>
          <p className="text-slate-500 mt-2">Join WebPOS V3 Today</p>
        </div>

        {error && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
              error.includes("Success")
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {error.includes("Success") ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
              Full Name
            </label>
            <div className="relative">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Email with On-Time Validation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                required
                className={`w-full p-3.5 pl-12 bg-slate-50 border rounded-2xl outline-none transition-all focus:ring-2 ${
                  !isTouched
                    ? "border-slate-200"
                    : emailValid
                      ? "border-emerald-500 focus:ring-emerald-100"
                      : "border-rose-500 focus:ring-rose-100"
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsTouched(true);
                }}
                placeholder="you@example.com"
              />
              {isTouched && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {emailValid ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={18} className="text-rose-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="password"
                required
                className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading || (isTouched && !emailValid)}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Or
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-3">
            <GoogleIcon />
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </span>
        </button>

        <p className="text-center mt-8 text-sm text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            className="text-black font-bold hover:underline"
            onClick={() => router.push("/auth/login")}
          >
            Log In
          </button>
        </p>
      </div>
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
