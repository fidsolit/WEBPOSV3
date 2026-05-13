import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalShellProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  widthClassName?: string;
}

export function ModalShell({
  title,
  children,
  onClose,
  widthClassName = "max-w-md",
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`w-full rounded-3xl bg-white p-8 shadow-2xl ${widthClassName}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
