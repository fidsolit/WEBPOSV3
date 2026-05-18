import { formatCurrency } from "../utils";
import type { RecentDeliveryItem } from "../types";

interface RecentDeliveriesTableProps {
  recentDeliveries: RecentDeliveryItem[];
}

export function RecentDeliveriesTable({
  recentDeliveries,
}: RecentDeliveriesTableProps) {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-lg font-bold">Recent Deliveries</h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest stock refills received and recorded into inventory.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-8 py-4">Item</th>
              <th className="px-8 py-4">Quantity</th>
              <th className="px-8 py-4">Unit Cost</th>
              <th className="px-8 py-4">Notes</th>
              <th className="px-8 py-4">Encoded By</th>
              <th className="px-8 py-4">Transaction Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="transition-colors hover:bg-slate-50/50"
                >
                  <td className="px-8 py-4 font-semibold">
                    {delivery.item_name}
                  </td>
                  <td className="px-8 py-4 font-bold text-emerald-600">
                    +{delivery.quantity}
                  </td>
                  <td className="px-8 py-4 font-medium text-slate-600">
                    {delivery.unit_cost === null
                      ? "-"
                      : formatCurrency(delivery.unit_cost)}
                  </td>
                  <td className="px-8 py-4 text-slate-600">
                    {delivery.note || "-"}
                  </td>
                  <td className="px-8 py-4 font-medium text-slate-600">
                    {delivery.encoded_by}
                  </td>
                  <td className="px-8 py-4 text-slate-500">
                    {new Date(delivery.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-8 py-10 text-center text-slate-400">
                  No recent deliveries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
