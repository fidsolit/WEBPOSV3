import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// --- Interfaces ---
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  trend: number; // Positive for up, negative for down
}

interface ActionCardProps {
  label: string;
  color: string;
  icon: React.ReactNode;
}

// --- Main Component ---
export default function Home() {
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            POS<span className="text-blue-600">PRO</span>
          </h1>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active
          />
          <NavItem icon={<ShoppingCart size={20} />} label="New Sale" />
          <NavItem icon={<Package size={20} />} label="Inventory" />
          <NavItem icon={<Users size={20} />} label="Customers" />
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-bold">Overview</h2>
            <p className="text-slate-500 mt-1">Real-time store performance</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white hover:bg-slate-50 transition-all">
              Generate Report
            </button>
            <button className="px-5 py-2.5 rounded-xl font-semibold bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
              + Start New Sale
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Daily Revenue" value="$3,450.20" trend={12.5} />
          <StatCard label="Total Orders" value="128" trend={5.2} />
          <StatCard label="Avg. Order Value" value="$26.95" trend={-2.1} />
        </div>

        {/* Quick Actions Grid */}
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            label="Dine In"
            color="bg-orange-500"
            icon={<Users size={24} />}
          />
          <ActionCard
            label="Takeaway"
            color="bg-indigo-500"
            icon={<ShoppingCart size={24} />}
          />
          <ActionCard
            label="Cash Out"
            color="bg-emerald-500"
            icon={<DollarSign size={24} />}
          />
          <ActionCard
            label="Inventory"
            color="bg-rose-500"
            icon={<Package size={24} />}
          />
        </div>
      </main>
    </div>
  );
}

// --- Sub-components with TypeScript ---

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false }) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
      active
        ? "bg-blue-50 text-blue-600 font-bold"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    }`}
  >
    {icon}
    <span className="text-[15px]">{label}</span>
  </div>
);

const StatCard: React.FC<StatCardProps> = ({ label, value, trend }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
    <p className="text-slate-500 text-sm font-medium">{label}</p>
    <div className="mt-2 flex items-center justify-between">
      <h4 className="text-2xl font-bold">{value}</h4>
      <div
        className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
          trend >= 0
            ? "bg-emerald-50 text-emerald-600"
            : "bg-rose-50 text-rose-600"
        }`}
      >
        {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(trend)}%
      </div>
    </div>
  </div>
);

const ActionCard: React.FC<ActionCardProps> = ({ label, color, icon }) => (
  <button
    className={`${color} group relative h-40 rounded-3xl p-6 text-left text-white overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95`}
  >
    <div className="relative z-10 h-full flex flex-col justify-between">
      <div className="bg-white/20 w-fit p-2 rounded-xl">{icon}</div>
      <span className="text-xl font-bold tracking-tight">{label}</span>
    </div>
    {/* Decorative background circle */}
    <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
  </button>
);
