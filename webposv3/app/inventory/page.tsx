"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
const initialData = [
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
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [router]);
  const [items] = useState(initialData);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Inventory Management
          </h1>
          <p className="text-gray-500">Track and manage your stock levels</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Add New Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Products</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-orange-500">
            {items.filter((i) => i.status === "Low Stock").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-500">
            {items.filter((i) => i.status === "Out of Stock").length}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-800">
                  {item.name}
                </td>
                <td className="px-6 py-4 text-gray-500">{item.sku}</td>
                <td className="px-6 py-4">{item.stock}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:underline mr-4">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
