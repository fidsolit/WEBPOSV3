"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email,
            role: "cashier",
          },
        },
      });

      console.log("SIGNUP RESPONSE:", { data, error });

      if (error) {
        // Database error saving new user = PostgreSQL TRIGGER/FUNCTION failure
        // Check: 1) Does public.profiles table exist? 2) Is the trigger created? 3) Are RLS policies correct?
        console.error("SIGNUP ERROR DETAILS:", {
          message: error.message,
          code: error.code,
          status: error.status,
        });
        setError(`Signup failed: ${error.message}`);
        return;
      }

      if (!data.user) {
        setError("Failed to create user account");
        return;
      }

      if (!data.session) {
        setError("Please check your email for the confirmation link!");
        return;
      }

      // Session exists, proceed to POS
      router.push("/pos");
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Register</h1>
          <p className="text-sm text-gray-500">Create your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="mb-4">
          <label className="text-sm text-gray-600">Full Name</label>
          <input
            className="w-full mt-1 p-3 border rounded-lg"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="w-full mt-1 p-3 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="text-sm text-gray-600">Password</label>
          <input
            type="password"
            className="w-full mt-1 p-3 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="text-xs text-center mt-4">
          Already have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => router.push("/auth/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
