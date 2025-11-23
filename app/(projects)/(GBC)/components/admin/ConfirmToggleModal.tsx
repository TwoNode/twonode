// "use client" directive for client component
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

interface ConfirmToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  adminName: string;
  /**
   * Current active status of the admin. If true, the admin is currently active and the action will deactivate.
   * If false, the admin is inactive and the action will activate.
   */
  isActive?: boolean;
  isLoading?: boolean;
}

export function ConfirmToggleModal({
  isOpen,
  onClose,
  onConfirm,
  adminName,
  isActive,
  isLoading,
}: ConfirmToggleModalProps) {
  const actionVerb = isActive ? "Deactivate" : "Activate";
  const actionColor = isActive ? "text-orange-600" : "text-green-600";
  const buttonBg = isActive
    ? "bg-orange-600 hover:bg-orange-700"
    : "bg-green-600 hover:bg-green-700";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              {actionVerb} Administrator?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Are you sure you want to {actionVerb.toLowerCase()}{" "}
            <span className="font-semibold text-gray-900">{adminName}</span> ?
            <br />
            This will {isActive ? "deactivate" : "activate"} the admin's
            account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} className="sm:mr-2">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`${buttonBg} focus:ring-${
              isActive ? "orange" : "green"
            }-600`}
          >
            {isLoading ? `${actionVerb}ing...` : actionVerb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
