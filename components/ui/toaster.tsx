"use client";

import * as React from "react";
import { Toast, ToastTitle, ToastDescription } from "./toast";
import { cn } from "@/lib/utils";

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
}

interface ToasterContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}

const ToasterContext = React.createContext<ToasterContextValue | undefined>(
  undefined
);

export function useToast() {
  const context = React.useContext(ToasterContext);
  if (!context) {
    throw new Error("useToast must be used within a ToasterProvider");
  }
  return context;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToasterContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster toasts={toasts} onClose={removeToast} />
    </ToasterContext.Provider>
  );
}

interface ToasterProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

function Toaster({ toasts, onClose }: ToasterProps) {
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
      )}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onClose={() => onClose(toast.id)}
          className="animate-in slide-in-from-right-full"
        >
          {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
          {toast.description && (
            <ToastDescription>{toast.description}</ToastDescription>
          )}
        </Toast>
      ))}
    </div>
  );
}

export { Toaster };
