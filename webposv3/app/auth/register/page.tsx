"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  const [error, setError] = useState<string | null>(null);
  const [emailValid, setEmailValid] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  // Real-time Email Validation
  useEffect(() => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(pattern.test(email));
  }, [email]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailValid) {
      setError("Please enter a valid email address");
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
            role: "cashier",
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
        await supabase
          .from("profiles")
          .update({ is_approved: false })
          .eq("id", data.session.user.id)
          .eq("role", "cashier");
        await supabase.auth.signOut();
        setError("Signup successful. Please wait for admin approval before logging in.");
      } else {
        if (data?.user?.id) {
          await supabase
            .from("profiles")
            .update({ is_approved: false })
            .eq("id", data.user.id)
            .eq("role", "cashier");
        }
        setError(
          "Success! Please check your email for confirmation, then wait for admin approval.",
        );
      }
    } catch (err) {
      setError("An unexpected connection error occurred.");
    } finally {
      setLoading(false);
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
            disabled={loading || (isTouched && !emailValid)}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-slate-500">
          Already have an account?{" "}
          <button
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
