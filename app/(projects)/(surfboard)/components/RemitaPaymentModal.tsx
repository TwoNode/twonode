"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Copy,
  User,
  Building,
  Calendar,
  CheckCircle,
  Info,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { verifyBatchPaymentWithPdf } from "../actions/codActions";
import { useRouter } from "next/navigation";

export interface SubmitterInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  payerID?: number | null;
  payerIDType?: string | null;
}

export interface BatchData {
  id: string;
  batchCode: string;
  totalAmount: number;
  submitter: SubmitterInfo | null;
}

interface RemitaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchData: BatchData;
  onSuccess?: () => void;
}

export function RemitaPaymentModal({
  isOpen,
  onClose,
  batchData,
  onSuccess,
}: RemitaPaymentModalProps) {
  const router = useRouter();
  const [manualRRR, setManualRRR] = useState("");
  const [manualEbsUrl, setManualEbsUrl] = useState("");
  const [showManualEbs, setShowManualEbs] = useState(false);
  const [isVerifyingRRR, setIsVerifyingRRR] = useState(false);

  const today = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy

  const handleCopyAmount = () => {
    if (batchData?.totalAmount) {
      navigator.clipboard.writeText(batchData.totalAmount.toString());
      toast.success("Amount copied to clipboard");
    }
  };

  const handleVerifyRRR = async () => {
    if (!manualRRR || manualRRR.length < 5) {
      toast.error("Please enter a valid Remita RRR");
      return;
    }

    if (showManualEbs && !manualEbsUrl) {
      toast.error("Please enter the EBS Receipt URL");
      return;
    }

    try {
      setIsVerifyingRRR(true);

      const result = await verifyBatchPaymentWithPdf(
        batchData.id,
        manualRRR,
        showManualEbs ? manualEbsUrl : undefined,
      );

      if (result.success && result.data) {
        if (result.data.status === "LASG_PAID") {
          toast.success(
            "Payment verified! Receipt captured and plans submitted.",
          );
          if (onSuccess) onSuccess();
          onClose();
          router.refresh();
        } else {
          toast.success("Payment status updated: " + result.data.status);
        }
      } else {
        toast.error(result.error || "Failed to verify RRR");
        if (
          result.error?.includes("Manual Input") ||
          result.error?.includes("extract")
        ) {
          setShowManualEbs(true);
        }
      }
    } catch (error) {
      console.error("RRR Verification error:", error);
      toast.error("Failed to verify RRR");
    } finally {
      setIsVerifyingRRR(false);
    }
  };

  const handleModalClose = () => {
    if (
      !confirm(
        "You have an active batch submission. Are you sure you want to close? You will need to provide the RRR later to verify payment.",
      )
    ) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden bg-gray-50">
        <DialogHeader className="p-6 pb-2 border-b bg-white">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Complete Payment for Batch {batchData.batchCode}
              </DialogTitle>
              <DialogDescription>
                Generate your RRR, make payment, and verify to complete
                submission.
              </DialogDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Total Amount
              </p>
              <div className="flex items-center gap-2 justify-end group">
                <p className="text-2xl font-bold text-green-700">
                  ₦{batchData.totalAmount.toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  onClick={handleCopyAmount}
                  title="Copy Amount"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Payer Info & Instruction */}
          <div className="w-1/3 p-6 overflow-y-auto border-r bg-white space-y-6">
            {/* Payer Info Card */}
            <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4" /> Payer Information
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">Payer ID</span>
                  <span className="font-mono font-medium">
                    {batchData.submitter?.payerID || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">
                    Payer ID Type
                  </span>
                  <span className="font-medium">
                    {batchData.submitter?.payerIDType || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Name</span>
                  <span className="font-medium">
                    {batchData.submitter?.firstName}{" "}
                    {batchData.submitter?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span
                    className="font-medium truncate"
                    title={batchData.submitter?.email}
                  >
                    {batchData.submitter?.email}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Phone</span>
                  <span className="font-medium">
                    {batchData.submitter?.phoneNumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info Card */}
            <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                <Building className="w-4 h-4" /> Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">
                    Agency Name
                  </span>
                  <span className="font-medium">
                    4830000 -- 61004 -- Office of Surveyor General
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">
                    Revenue Name
                  </span>
                  <span className="font-medium">
                    4020002 -- 32202 -- Lands Registry Transactions
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Period</span>
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {today}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Verify Payment</label>
                <p className="text-xs text-gray-500">
                  Enter the RRR used for payment. The system will extract
                  receipt details automatically.
                </p>
                <input
                  type="text"
                  placeholder="Enter RRR (e.g. 1913-9281-9355)"
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:border-blue-500 outline-none font-mono tracking-wider"
                  value={manualRRR}
                  onChange={(e) => setManualRRR(e.target.value)}
                />
              </div>

              <AnimatePresence>
                {showManualEbs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 p-3 bg-amber-50 rounded border border-amber-200 overflow-hidden"
                  >
                    <div className="flex items-start gap-2 text-amber-800">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-xs">
                        Automatic receipt extraction failed. Please check your
                        email for the Lagos EBS Receipt URL and paste it below.
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="https://printreceipt.ebs-rcm.com/..."
                      className="w-full h-10 px-3 rounded-md border border-amber-300 focus:border-amber-500 outline-none text-xs"
                      value={manualEbsUrl}
                      onChange={(e) => setManualEbsUrl(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={handleVerifyRRR}
                disabled={isVerifyingRRR || !manualRRR}
                className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold"
              >
                {isVerifyingRRR ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying & Capturing Receipt...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify & Complete
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel: Remita Iframe */}
          <div className="w-2/3 bg-gray-100 relative border-l">
            <div className="absolute top-0 left-0 right-0 bg-white border-b px-4 py-2 flex items-center justify-between z-10">
              <span className="text-xs font-semibold text-gray-500">
                REMITA PAYMENT PORTAL
              </span>
              <a
                href="https://login.remita.net/remita/lirs/internal/pay.reg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 flex items-center hover:underline"
              >
                Open in new tab <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
            <iframe
              src="https://login.remita.net/remita/lirs/internal/pay.reg"
              className="w-full h-full pt-8 border-none"
              title="Remita Payment Portal"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
