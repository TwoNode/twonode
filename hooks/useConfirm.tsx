"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions;
};

/**
 * Promise-based replacement for window.confirm(), styled to match the
 * design system (and readable in dark mode, unlike the native dialog).
 *
 * const { confirm, ConfirmDialog } = useConfirm();
 * // render {ConfirmDialog} once anywhere in the component tree
 * if (!(await confirm("Delete this item?"))) return;
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolver = useRef<(value: boolean) => void>();

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const resolved: ConfirmOptions =
      typeof options === "string" ? { description: options } : options;
    setState({ open: true, options: resolved });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handle = useCallback((result: boolean) => {
    setState((prev) => (prev ? { ...prev, open: false } : prev));
    resolver.current?.(result);
  }, []);

  const ConfirmDialog = state ? (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handle(false);
      }}
    >
      <AlertDialogContent className="bg-white dark:bg-surface border-gray-200 dark:border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-white">
            {state.options.title ?? "Are you sure?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
            {state.options.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => handle(false)}
            className="border-gray-200 dark:border-white/10 bg-white dark:bg-surface text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            {state.options.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handle(true)}
            className={
              state.options.variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
            }
          >
            {state.options.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  return { confirm, ConfirmDialog };
}
