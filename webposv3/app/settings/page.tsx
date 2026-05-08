"use client";
import React, { useState } from "react";
import { Settings, Shield, HardDrive, Printer, Database } from "lucide-react";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");

  const menuItems = [
    { id: "general", label: "General Store", icon: <Settings size={20} /> },
    { id: "database", label: "Supabase Sync", icon: <Database size={20} /> },
    { id: "hardware", label: "Peripherals", icon: <Printer size={20} /> },
    { id: "security", label: "Access Control", icon: <Shield size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">POS Settings</h1>
        </div>
        <nav className="mt-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            {menuItems.find((m) => m.id === activeTab)?.label} Configuration
          </h2>
          <p className="text-gray-500">
            Manage your system preferences and business logic.
          </p>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-4xl">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                    placeholder="Store Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                    defaultValue="₱"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  className="mt-1 block w-32 border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                  defaultValue="12"
                />
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-700">
                    Connected to Supabase
                  </span>
                </div>
                <button className="text-xs font-semibold text-green-700 underline">
                  Refresh Schema
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Realtime Sync Interval (Seconds)
                </label>
                <input
                  type="range"
                  className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">
              Discard
            </button>
            <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition">
              Save Changes
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
