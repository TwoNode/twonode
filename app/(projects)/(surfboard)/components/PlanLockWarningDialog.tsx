"use client";

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
import { AlertTriangle } from "lucide-react";

interface PlanLockWarningDialogProps {
  isOpen: boolean;
  planNumber: string | null;
  onConfirmLeave: () => void;
  onCancel: () => void;
}

export function PlanLockWarningDialog({
  isOpen,
  planNumber,
  onConfirmLeave,
  onCancel,
}: PlanLockWarningDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">Leave Page?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>
              You have a plan locked for editing. Leaving will release the lock
              and another admin may take over.
            </p>
            {planNumber && (
              <div className="bg-gray-100 dark:bg-white/10 px-4 py-3 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">Locked Plan:</span>
                <p className="font-semibold text-gray-900 dark:text-white">{planNumber}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel} className="flex-1 sm:flex-none">
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmLeave}
            className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white"
          >
            Leave Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
