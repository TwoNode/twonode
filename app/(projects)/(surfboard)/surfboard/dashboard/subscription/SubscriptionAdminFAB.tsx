"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Settings, Trash2, Loader2, RefreshCw } from "lucide-react";
import { clearUserSubscription } from "@/app/(projects)/(surfboard)/actions/subscriptionActions";

export default function SubscriptionAdminFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearSubscription = async () => {
    setIsClearing(true);
    try {
      const result = await clearUserSubscription();

      if (result?.success) {
        toast.success("Subscription cleared successfully");
        // Refresh the page to update the UI
        window.location.reload();
      } else {
        toast.error(result?.error || "Failed to clear subscription");
      }
    } catch (error: any) {
      console.error("Error clearing subscription:", error);
      toast.error(
        error?.message || "An error occurred while clearing subscription"
      );
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                setShowClearDialog(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Subscription
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                window.location.reload();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your subscription from the
              database? This action will permanently delete your subscription
              record and cannot be undone.
              <br />
              <br />
              <span className="text-red-600 font-semibold">
                ⚠️ Warning: This is a destructive action!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearSubscription}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
