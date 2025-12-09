/**
 * Submitted Batches Modal Component
 * Displays all submitted red copy batches for the current user
 * Allows retrying failed/pending payments
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Loader2,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Package,
  Trash2,
} from "lucide-react";
import {
  getUserBatches,
  retryBatchPayment,
  verifyBatchPayment,
  deleteAllBatches,
} from "../actions/codActions";
import { useRouter } from "next/navigation";
import PaystackPop from "@paystack/inline-js";
import { format } from "date-fns";

interface Batch {
  id: string;
  batchCode: string;
  planCount: number;
  totalFees: number;
  systemCharges: number;
  totalAmount: number;
  paymentStatus: string;
  userPaymentRef: string | null;
  userPaymentDate: Date | null;
  createdAt: Date;
}

interface SubmittedBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TransactionObject = {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
  redirecturl: string;
};

export function SubmittedBatchesModal({
  isOpen,
  onClose,
  onSuccess,
}: SubmittedBatchesModalProps) {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingBatchId, setPayingBatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    []
  );

  // Fetch batches when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBatches();
    }
  }, [isOpen]);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const result = await getUserBatches();
      if (result.success && result.data) {
        setBatches(result.data.batches);
      } else {
        toast.error(result.error || "Failed to load batches");
      }
    } catch (error) {
      console.error("Error loading batches:", error);
      toast.error("An error occurred while loading batches");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = async (batchId: string) => {
    if (!publicKey) {
      toast.error("Server Error: Misconfigured Payment setup");
      return;
    }

    setPayingBatchId(batchId);
    try {
      const result = await retryBatchPayment(batchId);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      const { reference, email, amount, batchCode } = result.data;

      // Validate amount
      if (!amount || typeof amount !== "number" || amount <= 0) {
        throw new Error(`Invalid payment amount: ${amount}`);
      }

      console.log("Payment initialization data:", {
        reference,
        email,
        amount,
        batchCode,
      });

      // Convert from NAIRA (server response) to KOBO (Paystack requires kobo: 1 naira = 100 kobo)
      const amountInKobo = Math.round(amount * 100);

      console.log("Amount in kobo:", amountInKobo);

      // Initialize Paystack popup
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        reference,
        email,
        amount: amountInKobo, // Convert to kobo
        currency: "NGN",
        metadata: {
          custom_fields: [
            {
              display_name: "Batch ID",
              variable_name: "batch_id",
              value: batchId,
            },
            {
              display_name: "Batch Code",
              variable_name: "batch_code",
              value: batchCode,
            },
            {
              display_name: "Type",
              variable_name: "type",
              value: "certificate_of_deposit_retry",
            },
            {
              display_name: "Platform",
              variable_name: "platform",
              value: "surfboard",
            },
          ],
        },
        onSuccess: async (transaction: TransactionObject) => {
          try {
            console.log("Payment successful:", transaction);
            toast.loading("Verifying payment...", { id: "verify-payment" });

            const verification = await verifyBatchPayment(reference);

            toast.dismiss("verify-payment");

            if (verification?.success) {
              toast.success("Payment verified successfully!");

              // Reload batches to show updated status
              await loadBatches();

              if (onSuccess) onSuccess();
              router.refresh();
            } else {
              throw new Error(verification?.error || "Verification failed");
            }
          } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error.message || "Failed to verify payment");
          } finally {
            setPayingBatchId(null);
          }
        },
        onCancel: () => {
          toast.info("Payment cancelled");
          setPayingBatchId(null);
        },
        onError: (error: { message: string }) => {
          console.error("Payment error:", error);
          toast.error(error.message || "Payment failed");
          setPayingBatchId(null);
        },
      });
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast.error(error?.message || "Failed to initialize payment");
      setPayingBatchId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_USER_PAYMENT":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            <Clock className="w-3 h-3 mr-1" />
            Payment Pending
          </Badge>
        );
      case "USER_PAID":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "LASG_PAID":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300"
          >
            <Package className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case "ACCOUNTS_APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-300"
          >
            {status}
          </Badge>
        );
    }
  };

  const canPayBatch = (status: string) => {
    return status === "PENDING_USER_PAYMENT";
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL batches? This will reset all related plans and cannot be undone!"
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAllBatches();
      if (result.success && result.data) {
        toast.success(
          `Successfully deleted ${result.data.deletedCount} batch(es)`
        );
        await loadBatches();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete batches");
      }
    } catch (error) {
      console.error("Error deleting batches:", error);
      toast.error("An error occurred while deleting batches");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                My Submitted Batches
              </DialogTitle>
              <DialogDescription>
                View all your submitted red copy batches and manage payments
              </DialogDescription>
            </div>
            {process.env.NODE_ENV !== "production" && batches.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={isDeleting || isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All (DEV)
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                No batches submitted yet
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Submit plans for Certificate of Deposit to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {batch.batchCode}
                        </h3>
                        {getStatusBadge(batch.paymentStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Package className="w-4 h-4" />
                          <span>
                            {batch.planCount} plan
                            {batch.planCount !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(batch.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-900 font-semibold">
                          <CreditCard className="w-4 h-4" />
                          <span>₦{batch.totalAmount.toLocaleString()}</span>
                        </div>

                        {batch.userPaymentDate && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>
                              Paid{" "}
                              {format(new Date(batch.userPaymentDate), "MMM d")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {canPayBatch(batch.paymentStatus) && (
                        <Button
                          size="sm"
                          onClick={() => handlePayNow(batch.id)}
                          disabled={payingBatchId === batch.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {payingBatchId === batch.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Pay Now
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
