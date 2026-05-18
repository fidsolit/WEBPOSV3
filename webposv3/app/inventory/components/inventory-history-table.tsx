import { formatCurrency } from "../utils";
import type { RecentInventoryHistoryItem } from "../types";

interface InventoryHistoryTableProps {
  historyItems: RecentInventoryHistoryItem[];
}

function formatMovementLabel(
  movementType: RecentInventoryHistoryItem["movement_type"],
) {
  switch (movementType) {
    case "sale":
      return "Sale";
    case "restock":
      return "Delivery";
    case "void_restore":
      return "Void Restore";
    case "adjustment":
      return "Adjustment";
    case "transfer_in":
      return "Transfer In";
    case "transfer_out":
      return "Transfer Out";
    default:
      return movementType;
  }
}

function isPositiveMovement(
  movementType: RecentInventoryHistoryItem["movement_type"],
) {
  return movementType === "restock" || movementType === "void_restore" || movementType === "transfer_in";
}

export function InventoryHistoryTable({
  historyItems,
}: InventoryHistoryTableProps) {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-lg font-bold">Inventory History</h2>
        <p className="mt-1 text-sm text-slate-500">
          Recent stock movements across deliveries, sales, adjustments, and restored items.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-8 py-4">Item</th>
              <th className="px-8 py-4">Movement</th>
              <th className="px-8 py-4">Quantity</th>
              <th className="px-8 py-4">Unit Cost</th>
              <th className="px-8 py-4">Notes</th>
              <th className="px-8 py-4">Encoded By</th>
              <th className="px-8 py-4">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {historyItems.length > 0 ? (
              historyItems.map((item) => {
                const positive = isPositiveMovement(item.movement_type);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-8 py-4 font-semibold">{item.item_name}</td>
                    <td className="px-8 py-4 text-sm font-medium text-slate-600">
                      {formatMovementLabel(item.movement_type)}
                    </td>
                    <td
                      className={`px-8 py-4 font-bold ${
                        positive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {positive ? "+" : "-"}
                      {item.quantity}
                    </td>
                    <td className="px-8 py-4 text-slate-600">
                      {item.unit_cost === null ? "-" : formatCurrency(item.unit_cost)}
                    </td>
                    <td className="px-8 py-4 text-slate-600">{item.note || "-"}</td>
                    <td className="px-8 py-4 text-slate-600">{item.encoded_by}</td>
                    <td className="px-8 py-4 text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-8 py-10 text-center text-slate-400">
                  No inventory history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
