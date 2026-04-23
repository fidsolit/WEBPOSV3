"use client";

import { useState, useEffect } from "react"; // Added useEffect
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Prevent form flicker

  // --- Redirect if already logged in ---
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/pos");
      } else {
        setIsChecking(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    router.push("/pos");
  };

  // While checking session, show a clean background or loader
  if (isChecking) {
    return <div className="min-h-screen bg-gray-100" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">WebPOS V3</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="w-full mt-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="text-sm text-gray-600">Password</label>
          <input
            type="password"
            className="w-full mt-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          POS System • Secure Login
        </p>
        <div className="text-center mt-4">
          <Link
            href="/auth/register"
            className="text-sm text-blue-600 hover:underline font-semibold"
          >
            Don't have account? sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
