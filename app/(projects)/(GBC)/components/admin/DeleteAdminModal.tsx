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

interface DeleteAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  adminName: string;
  isLoading?: boolean;
}

export function DeleteAdminModal({
  isOpen,
  onClose,
  onConfirm,
  adminName,
  isLoading,
}: DeleteAdminModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Remove Administrator?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-gray-900">{adminName}</span>{" "}
            from the administrators list? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} className="sm:mr-2">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? "Removing..." : "Remove Admin"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
