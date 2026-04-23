"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Store,
  Menu,
  X,
} from "lucide-react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="relative flex items-center justify-between px-6 py-5 max-w-7xl mx-auto z-50">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            P
          </div>
          <span className="text-xl md:text-2xl font-bold tracking-tight">
            POS<span className="text-blue-600">PRO</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
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

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-600"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Dropdown */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-6 flex flex-col gap-4 shadow-xl md:hidden animate-in slide-in-from-top duration-200">
            <Link
              href="/auth/login"
              className="text-lg font-semibold text-slate-600 py-2"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="text-lg font-semibold bg-blue-600 text-white p-4 rounded-2xl text-center"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-10 md:pt-20 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs md:text-sm font-bold mb-6">
            <Store size={14} /> Web-Based POS V3 is now live
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] mb-6">
            Manage your store <br />
            <span className="text-blue-600">smarter, not harder.</span>
          </h1>
          <p className="text-base md:text-lg text-slate-500 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            The all-in-one point of sale system designed for retail. Track
            sales, manage stock, and grow your business anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 lg:mt-0">
          <FeatureCard
            icon={<ShoppingCart className="text-blue-600" />}
            title="Fast Checkout"
            desc="Process transactions in seconds with our optimized UI."
          />
          <FeatureCard
            icon={<BarChart3 className="text-emerald-500" />}
            title="Analytics"
            desc="Real-time revenue tracking and performance."
          />
          <FeatureCard
            icon={<ShieldCheck className="text-orange-500" />}
            title="Secure"
            desc="Enterprise security with Supabase Auth."
          />
          <div className="bg-blue-600 p-8 rounded-3xl text-white flex flex-col justify-end min-h-[160px]">
            <p className="text-3xl font-bold">99.9%</p>
            <p className="text-blue-100 opacity-80 text-sm">
              Uptime for your business.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 text-center text-slate-400 text-xs md:text-sm">
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
    <div className="p-6 md:p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition text-center sm:text-left">
      <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0">
        {icon}
      </div>
      <h3 className="font-bold text-xl mb-2">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
