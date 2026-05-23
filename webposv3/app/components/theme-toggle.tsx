"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { AppTheme, applyTheme, resolvePreferredTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>(() => resolvePreferredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const changeTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        Theme
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => changeTheme("light")}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            theme === "light"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:bg-white/70"
          }`}
        >
          <Sun size={16} />
          Light
        </button>
        <button
          type="button"
          onClick={() => changeTheme("dark")}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            theme === "dark"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200/70"
          }`}
        >
          <Moon size={16} />
          Dark
        </button>
      </div>
    </div>
  );
}
