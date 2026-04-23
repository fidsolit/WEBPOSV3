import React from "react";
import Link from "next/link";
import {
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Store,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <span className="text-2xl font-bold tracking-tight">
            POS<span className="text-blue-600">PRO</span>
          </span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="px-6 py-2.5 font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-6">
            <Store size={16} /> Web-Based POS V3 is now live
          </div>
          <h1 className="text-6xl font-extrabold leading-[1.1] mb-6">
            Manage your store <br />
            <span className="text-blue-600">smarter, not harder.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
            The all-in-one point of sale system designed for retail and
            inventory management. Track sales, manage stock, and grow your
            business in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/pos"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition shadow-xl"
            >
              Go to Dashboard <ArrowRight size={20} />
            </Link>
            <button className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-50 transition">
              View Demo
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FeatureCard
            icon={<ShoppingCart className="text-blue-600" />}
            title="Fast Checkout"
            desc="Process transactions in seconds with our optimized UI."
          />
          <FeatureCard
            icon={<BarChart3 className="text-emerald-500" />}
            title="Analytics"
            desc="Real-time revenue tracking and sales performance."
          />
          <FeatureCard
            icon={<ShieldCheck className="text-orange-500" />}
            title="Secure"
            desc="Enterprise-grade security with Supabase Auth."
          />
          <div className="bg-blue-600 p-8 rounded-3xl text-white flex flex-col justify-end min-h-[200px]">
            <p className="text-3xl font-bold">99.9%</p>
            <p className="text-blue-100 opacity-80">
              Uptime guaranteed for your business.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 text-center text-slate-400 text-sm">
        <p>© 2024 POSPRO System. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition">
      <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="font-bold text-xl mb-2">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
