"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import Sidebar from "../components/sidebar";

interface InventoryItem {
  id: number | string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  status: string;
}

const initialData: InventoryItem[] = [
  {
    id: 1,
    name: "Wireless Mouse",
    sku: "WM-101",
    stock: 45,
    price: 25.0,
    status: "In Stock",
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    sku: "MK-202",
    stock: 12,
    price: 89.99,
    status: "Low Stock",
  },
  {
    id: 3,
    name: "USB-C Hub",
    sku: "UH-303",
    stock: 0,
    price: 45.5,
    status: "Out of Stock",
  },
];

export default function Inventory() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    stock: "",
    price: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) router.push("/auth/login");
      else setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const stockNum = parseInt(newItem.stock);
    const product: InventoryItem = {
      id: Date.now(),
      name: newItem.name,
      sku: newItem.sku,
      stock: stockNum,
      price: parseFloat(newItem.price),
      status:
        stockNum > 10
          ? "In Stock"
          : stockNum > 0
            ? "Low Stock"
            : "Out of Stock",
    };
    setItems([product, ...items]);
    setNewItem({ name: "", sku: "", stock: "", price: "" });
    setIsModalOpen(false);
  };

  if (checkingAuth)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. Sidebar stays on the left */}
      <Sidebar onNewSaleClick={() => setIsModalOpen(true)} />

      {/* 2. Main Content Wrapper */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <button
              onClick={() => router.push("/pos")}
              className="flex items-center gap-2 text-blue-600 font-medium mb-2 hover:underline"
            >
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              Inventory Management
            </h1>
            <p className="text-gray-500">Track and manage your stock levels</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-blue-100"
          >
            <Plus size={20} /> Add New Product
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            label="Total Products"
            value={items.length}
            color="text-slate-900"
          />
          <StatCard
            label="Low Stock"
            value={items.filter((i) => i.status === "Low Stock").length}
            color="text-orange-500"
          />
          <StatCard
            label="Out of Stock"
            value={items.filter((i) => i.status === "Out of Stock").length}
            color="text-red-500"
          />
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-8 py-5">Product Name</th>
                  <th className="px-8 py-5">SKU</th>
                  <th className="px-8 py-5">Stock</th>
                  <th className="px-8 py-5">Price</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-8 py-5 font-bold text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-8 py-5 text-slate-500 font-medium">
                      {item.sku}
                    </td>
                    <td className="px-8 py-5 font-medium">{item.stock}</td>
                    <td className="px-8 py-5 font-bold text-emerald-600">
                      ₱{item.price.toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="text-blue-600 font-bold hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">New Product</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-500">
                  Product Name
                </label>
                <input
                  required
                  type="text"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-500">
                    SKU
                  </label>
                  <input
                    required
                    type="text"
                    value={newItem.sku}
                    onChange={(e) =>
                      setNewItem({ ...newItem, sku: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500">
                    Price (₱)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500">
                  Initial Stock
                </label>
                <input
                  required
                  type="number"
                  value={newItem.stock}
                  onChange={(e) =>
                    setNewItem({ ...newItem, stock: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
              >
                Create Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for clean code
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <p className="text-sm font-bold text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
