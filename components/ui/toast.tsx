"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
        error: "border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20",
        warning: "border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, onClose, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = "Toast";

export interface ToastTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

const ToastTitle = React.forwardRef<HTMLDivElement, ToastTitleProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  )
);
ToastTitle.displayName = "ToastTitle";

export interface ToastDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ToastDescription = React.forwardRef<HTMLDivElement, ToastDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
  )
);
ToastDescription.displayName = "ToastDescription";

export { Toast, ToastTitle, ToastDescription, toastVariants };
