"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2, Store } from "lucide-react";
import Sidebar from "../components/sidebar";

interface InventoryItem {
  id: string;
  stock: number;
  min_stock?: number;
  products:
    | {
        id: string;
        name: string;
        price: number;
        cost: number;
        barcode: string | null;
      }
    | null;
}

interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode: string | null;
}

interface InventoryRow {
  id: string;
  stock: number;
  min_stock?: number;
  products: InventoryProduct | InventoryProduct[] | null;
}

interface ProductOption {
  id: string;
  name: string;
}

export default function Inventory() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeBranchName, setActiveBranchName] =
    useState<string>("Loading branch...");

  const [newItem, setNewItem] = useState({
    name: "",
    barcode: "",
    stock: "",
    price: "",
    cost: "",
  });
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [variantForm, setVariantForm] = useState({
    productId: "",
    name: "",
    price: "",
    barcode: "",
    openingStock: "",
  });
  const [lossForm, setLossForm] = useState({
    productId: "",
    quantity: "",
    reason: "",
  });

  const fetchInventory = useCallback(async (branchId: string) => {
    const { data, error } = await supabase
      .from("inventory")
      .select(
        `
      id, 
      stock, 
      min_stock,
      branch_id,
      products (
        id, 
        name, 
        price, 
        cost,
        barcode
      )
    `,
      )
      .eq("branch_id", branchId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error.message);
      return;
    }

    if (data) {
      const normalizedItems = (data as InventoryRow[]).map((row) => ({
        id: row.id,
        stock: row.stock,
        min_stock: row.min_stock,
        products: Array.isArray(row.products) ? (row.products[0] ?? null) : row.products,
      }));
      setItems(normalizedItems);
    }
  }, []);

  const loadProductOptions = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) {
      console.error("Failed loading products:", error.message);
      return;
    }
    setProductOptions((data as ProductOption[]) ?? []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/pos");
        return;
      }
      setCheckingAuth(false);

      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id, name")
        .limit(1);

      if (branchError) {
        setActiveBranchName("Branch load failed");
        return;
      }

      if (branches && branches.length > 0) {
        setActiveBranchId(branches[0].id);
        setActiveBranchName(branches[0].name);
        fetchInventory(branches[0].id);
        loadProductOptions();
      } else {
        setActiveBranchName("No Branch Found");
      }
    };
    init();
  }, [router, fetchInventory, loadProductOptions]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId) return alert("Error: No active branch found.");
    const parsedPrice = Number.parseFloat(newItem.price);
    const parsedCost = Number.parseFloat(newItem.cost);
    const parsedStock = Number.parseInt(newItem.stock, 10);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return alert("Please enter a valid price.");
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return alert("Please enter a valid stock.");
    }
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      return alert("Please enter a valid unit cost.");
    }
    setLoading(true);

    try {
      const { data: product, error: pError } = await supabase
        .from("products")
        .insert([
          {
            name: newItem.name,
            barcode: newItem.barcode || null,
            price: parsedPrice,
            cost: parsedCost,
          },
        ])
        .select()
        .single();

      if (pError) throw pError;

      const { error: iError } = await supabase.from("inventory").insert([
        {
          product_id: product.id,
          branch_id: activeBranchId,
          stock: parsedStock,
        },
      ]);

      if (iError) throw iError;

      await fetchInventory(activeBranchId);
      setIsModalOpen(false);
      setNewItem({ name: "", barcode: "", stock: "", price: "", cost: "" });
    } catch (err: any) {
      if (err?.code === "23505") {
        alert("Barcode already exists. Please use a unique barcode.");
        return;
      }
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId) return alert("No active branch found.");
    if (!variantForm.productId || !variantForm.name.trim()) {
      return alert("Please select a product and enter variant name.");
    }
    const parsedPrice = Number.parseFloat(variantForm.price || "0");
    const parsedStock = Number.parseInt(variantForm.openingStock || "0", 10);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return alert("Please enter a valid variant price.");
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return alert("Please enter a valid opening stock.");
    }

    setLoading(true);
    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .insert([
        {
          product_id: variantForm.productId,
          name: variantForm.name.trim(),
          price: parsedPrice,
          barcode: variantForm.barcode.trim() || null,
        },
      ])
      .select("id")
      .single();

    if (variantError || !variant) {
      alert(variantError?.message || "Failed creating variant.");
      setLoading(false);
      return;
    }

    const { error: stockError } = await supabase
      .from("inventory_variant_stock")
      .insert([
        {
          variant_id: variant.id,
          branch_id: activeBranchId,
          stock: parsedStock,
        },
      ]);

    if (stockError) {
      alert(stockError.message);
      setLoading(false);
      return;
    }

    setIsVariantModalOpen(false);
    setVariantForm({
      productId: "",
      name: "",
      price: "",
      barcode: "",
      openingStock: "",
    });
    setLoading(false);
    alert("Variant added successfully.");
  };

  const handleLogLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId) return alert("No active branch found.");
    const qty = Number.parseInt(lossForm.quantity, 10);
    if (!lossForm.productId) return alert("Select a product.");
    if (!Number.isFinite(qty) || qty <= 0) {
      return alert("Enter a valid loss quantity.");
    }
    if (!lossForm.reason.trim()) return alert("Reason is required.");

    setLoading(true);
    const { data: inv, error: invError } = await supabase
      .from("inventory")
      .select("id, stock")
      .eq("branch_id", activeBranchId)
      .eq("product_id", lossForm.productId)
      .single();

    if (invError || !inv) {
      alert(invError?.message || "Inventory item not found.");
      setLoading(false);
      return;
    }
    if (inv.stock < qty) {
      alert(`Not enough stock. Available: ${inv.stock}`);
      setLoading(false);
      return;
    }

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id ?? null;

    const { error: lossError } = await supabase.from("inventory_losses").insert([
      {
        branch_id: activeBranchId,
        product_id: lossForm.productId,
        quantity: qty,
        reason: lossForm.reason.trim(),
        created_by: userId,
      },
    ]);

    if (lossError) {
      alert(lossError.message);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("inventory")
      .update({
        stock: inv.stock - qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inv.id);

    if (updateError) {
      alert(updateError.message);
      setLoading(false);
      return;
    }

    setIsLossModalOpen(false);
    setLossForm({ productId: "", quantity: "", reason: "" });
    setLoading(false);
    await fetchInventory(activeBranchId);
  };

  if (checkingAuth)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
      </div>
    );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <button
              onClick={() => router.push("/pos")}
              className="flex items-center gap-2 text-blue-600 font-medium mb-2 hover:underline"
            >
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <Store size={10} /> {activeBranchName}
              </span>
            </div>
            <h1 className="text-3xl font-bold">Inventory List</h1>
            <p className="text-slate-500">
              Managing stock for {activeBranchName}
            </p>
          </div>

          {/* This button should now trigger the modal below */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-blue-100"
          >
            <Plus size={20} /> Add Product
          </button>
          <button
            onClick={() => setIsVariantModalOpen(true)}
            className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-violet-100"
          >
            <Plus size={20} /> Add Variant
          </button>
          <button
            onClick={() => setIsLossModalOpen(true)}
            className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-rose-100"
          >
            <Plus size={20} /> Log Loss
          </button>
        </header>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-8 py-5">Product Name</th>
                <th className="px-8 py-5">Barcode</th>
                <th className="px-8 py-5">Current Stock</th>
                <th className="px-8 py-5">Unit Cost</th>
                <th className="px-8 py-5">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-8 py-5 font-bold">
                      {item.products?.name || "Unknown"}
                    </td>
                    <td className="px-8 py-5 text-slate-500 font-medium">
                      {item.products?.barcode || "-"}
                    </td>
                    <td className="px-8 py-5 font-medium">
                      <span
                        className={
                          item.stock <= (item.min_stock ?? 0)
                            ? "text-rose-600 font-bold"
                            : ""
                        }
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-amber-600 font-bold">
                      ₱{item.products?.cost?.toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-emerald-600 font-bold">
                      ₱{item.products?.price?.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-10 text-center text-slate-400"
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- MISSING MODAL CODE FIXED BELOW --- */}
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
                <label className="text-sm font-bold text-slate-500 mb-1 block">
                  Product Name
                </label>
                <input
                  required
                  placeholder="Enter name"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 mb-1 block">
                  Barcode
                </label>
                <input
                  required
                  placeholder="Scan or type barcode"
                  value={newItem.barcode}
                  onChange={(e) =>
                    setNewItem({ ...newItem, barcode: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-1 block">
                    Unit Cost (₱)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newItem.cost}
                    onChange={(e) =>
                      setNewItem({ ...newItem, cost: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-1 block">
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
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-1 block">
                    Stock
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
              </div>
              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  "Save Product"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {isVariantModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Variant</h2>
              <button
                onClick={() => setIsVariantModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddVariant} className="space-y-4">
              <select
                required
                value={variantForm.productId}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, productId: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              >
                <option value="">Select base product</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Variant name (e.g. 16GB RAM)"
                value={variantForm.name}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, name: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Variant price"
                value={variantForm.price}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, price: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              />
              <input
                placeholder="Variant barcode (optional)"
                value={variantForm.barcode}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, barcode: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              />
              <input
                type="number"
                placeholder="Opening stock"
                value={variantForm.openingStock}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, openingStock: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold"
              >
                {loading ? "Saving..." : "Save Variant"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLossModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Log Inventory Loss</h2>
              <button
                onClick={() => setIsLossModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLogLoss} className="space-y-4">
              <select
                required
                value={lossForm.productId}
                onChange={(e) =>
                  setLossForm({ ...lossForm, productId: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              >
                <option value="">Select product</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                placeholder="Loss quantity"
                value={lossForm.quantity}
                onChange={(e) =>
                  setLossForm({ ...lossForm, quantity: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              />
              <textarea
                required
                placeholder="Reason (damaged, expired, missing, etc.)"
                value={lossForm.reason}
                onChange={(e) =>
                  setLossForm({ ...lossForm, reason: e.target.value })
                }
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl"
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold"
              >
                {loading ? "Saving..." : "Save Loss Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
