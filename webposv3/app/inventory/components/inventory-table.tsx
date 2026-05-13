import type { InventoryItem } from "../types";
import { formatCurrency } from "../utils";

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-400">
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
              <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                <td className="px-8 py-5 font-bold">
                  {item.products?.name || "Unknown"}
                </td>
                <td className="px-8 py-5 font-medium text-slate-500">
                  {item.products?.barcode || "-"}
                </td>
                <td className="px-8 py-5 font-medium">
                  <span
                    className={
                      item.stock <= (item.min_stock ?? 0) ? "font-bold text-rose-600" : ""
                    }
                  >
                    {item.stock}
                  </span>
                </td>
                <td className="px-8 py-5 font-bold text-amber-600">
                  {formatCurrency(item.products?.cost)}
                </td>
                <td className="px-8 py-5 font-bold text-emerald-600">
                  {formatCurrency(item.products?.price)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-8 py-10 text-center text-slate-400">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
