"use client";

import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Trash2, Loader2, RefreshCw, BarChart3 } from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

interface SubscriptionAnalytics {
  activeCount: number;
  canceledCount: number;
  invalidSubscriptions: Array<{
    id: string;
    userId: string;
    status: string;
    subCode: string | null;
    emailToken: string | null;
  }>;
  recentWebhookEvents: Array<{
    event: string;
    status: string;
    count: number;
  }>;
}

export default function SubscriptionAdminFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const result = await surfboardApi.subscriptionAnalytics.get();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showAnalyticsDialog) {
      fetchAnalytics();
    }
  }, [showAnalyticsDialog]);

  const handleClearSubscription = async () => {
    setIsClearing(true);
    try {
      const result = await surfboardApi.subscription.clear();
      if (result?.success) {
        toast.success("Subscription cleared successfully");
        window.location.reload();
      } else {
        toast.error(result?.error || "Failed to clear subscription");
      }
    } catch (error: any) {
      console.error("Error clearing subscription:", error);
      toast.error(error?.message || "An error occurred while clearing subscription");
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
        {/* Analytics Button */}
        <Button
          onClick={() => setShowAnalyticsDialog(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-green-600 hover:bg-green-700"
        >
          <BarChart3 className="h-6 w-6" />
        </Button>

        {/* Settings Dropdown */}
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

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Analytics</DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-800">Active Subscriptions</h3>
                  <p className="text-2xl font-bold text-blue-600">{analytics.activeCount}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <h3 className="text-sm font-medium text-amber-800">Canceled Subscriptions</h3>
                  <p className="text-2xl font-bold text-amber-600">{analytics.canceledCount}</p>
                </div>
              </div>

              {/* Invalid Subscriptions */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Invalid Subscriptions</h3>
                {analytics.invalidSubscriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Missing Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {analytics.invalidSubscriptions.map((sub) => (
                          <tr key={sub.id}>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{sub.userId}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{sub.status}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {!sub.subCode && "subCode "}
                              {!sub.emailToken && "emailToken"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No invalid subscriptions found.</p>
                )}
              </div>

              {/* Recent Webhook Events */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Recent Webhook Events (Last 24h)</h3>
                {analytics.recentWebhookEvents.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.recentWebhookEvents.map((event, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded">
                        <div>
                          <span className="font-medium">{event.event}</span>
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                            {event.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{event.count} events</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No webhook events in the last 24 hours.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Failed to load analytics data.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Subscription Confirmation Dialog */}
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
