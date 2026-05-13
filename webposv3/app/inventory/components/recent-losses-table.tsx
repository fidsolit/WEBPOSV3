import type { RecentLossItem } from "../types";

interface RecentLossesTableProps {
  recentLosses: RecentLossItem[];
}

export function RecentLossesTable({ recentLosses }: RecentLossesTableProps) {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-lg font-bold">Recent Loss Logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest inventory items logged as damaged, expired, or missing.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-8 py-4">Item</th>
              <th className="px-8 py-4">Quantity</th>
              <th className="px-8 py-4">Reason</th>
              <th className="px-8 py-4">Encoded By</th>
              <th className="px-8 py-4">Transaction Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {recentLosses.length > 0 ? (
              recentLosses.map((loss) => (
                <tr key={loss.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-8 py-4 font-semibold">{loss.item_name}</td>
                  <td className="px-8 py-4 font-bold text-rose-600">-{loss.quantity}</td>
                  <td className="px-8 py-4 text-slate-600">{loss.reason}</td>
                  <td className="px-8 py-4 font-medium text-slate-600">
                    {loss.encoded_by}
                  </td>
                  <td className="px-8 py-4 text-slate-500">
                    {new Date(loss.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-10 text-center text-slate-400">
                  No recent loss logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
