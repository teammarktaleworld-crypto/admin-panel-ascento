"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="flex min-h-full items-start justify-center">
        <div className={cn("my-4 w-full max-w-2xl rounded-xl bg-white p-4 shadow-lg dark:bg-zinc-900", className)}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
