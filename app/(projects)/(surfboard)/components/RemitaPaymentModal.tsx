"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Copy,
  User,
  Building,
  Calendar,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Link as LinkIcon,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { verifyBatchPaymentWithLinks } from "../actions/codActions";
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
  const [lasgReceiptUrl, setLasgReceiptUrl] = useState("");
  const [remitaReceiptUrl, setRemitaReceiptUrl] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [errorPopup, setErrorPopup] = useState<{ step: string; message: string } | null>(null);

  const today = new Date().toLocaleDateString("en-GB");

  const handleCopyAmount = () => {
    if (batchData?.totalAmount) {
      navigator.clipboard.writeText(batchData.totalAmount.toString());
      toast.success("Amount copied to clipboard");
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Client-side URL format validation
  const isValidLasgUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes("ebs-rcm.com") || parsed.hostname.includes("printreceipt");
    } catch {
      return false;
    }
  };

  const isValidRemitaUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes("remita.net");
    } catch {
      return false;
    }
  };

  // Parse step label from server error: "[Step X: Label] Message" -> { step, message }
  const parseError = (error: string): { step: string; message: string } => {
    const match = error.match(/^\[(.+?)\]\s*(.+)$/s);
    if (match) {
      return { step: match[1], message: match[2] };
    }
    return { step: "Verification Error", message: error };
  };

  const showError = (stepOrRaw: string, message?: string) => {
    if (message) {
      setErrorPopup({ step: stepOrRaw, message });
    } else {
      setErrorPopup(parseError(stepOrRaw));
    }
  };

  const handleVerifyLinks = async () => {
    // Validate LASG URL
    if (!lasgReceiptUrl.trim()) {
      showError("Validation", "Please enter the LASG receipt link.");
      return;
    }
    if (!isValidLasgUrl(lasgReceiptUrl)) {
      showError("Validation", "Invalid LASG receipt URL. Expected a link from printreceipt.ebs-rcm.com");
      return;
    }

    // Validate Remita URL
    if (!remitaReceiptUrl.trim()) {
      showError("Validation", "Please enter the Remita receipt link.");
      return;
    }
    if (!isValidRemitaUrl(remitaReceiptUrl)) {
      showError("Validation", "Invalid Remita receipt URL. Expected a link from login.remita.net");
      return;
    }

    // Check if URLs are swapped
    if (lasgReceiptUrl.includes("remita.net")) {
      showError("Links Swapped", "It looks like you pasted the Remita link in the LASG field. Please swap the two links.");
      return;
    }
    if (remitaReceiptUrl.includes("ebs-rcm.com")) {
      showError("Links Swapped", "It looks like you pasted the LASG link in the Remita field. Please swap the two links.");
      return;
    }

    try {
      setIsVerifying(true);

      console.log("Starting verifyBatchPaymentWithLinks with:", {
        batchId: batchData.id,
        lasgReceiptUrl,
        remitaReceiptUrl,
      });

      const result = await verifyBatchPaymentWithLinks(
        batchData.id,
        lasgReceiptUrl.trim(),
        remitaReceiptUrl.trim(),
      );

      console.log("verifyBatchPaymentWithLinks result:", result);

      if (result.success && result.data) {
        if (result.data.status === "LASG_PAID") {
          toast.success("Payment verified! Receipt captured and plans submitted.");
          if (onSuccess) onSuccess();
          onClose();
          router.refresh();
        } else {
          toast.success("Payment status updated: " + result.data.status);
        }
      } else {
        showError(result.error || "Failed to verify payment");
      }
    } catch (error) {
      console.error("Link verification error:", error);
      showError("Network Error", "Failed to verify payment links. Please check your internet connection and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleModalClose = () => {
    if (
      !confirm(
        "You have an active batch submission. Are you sure you want to close? You will need to provide the receipt links later to verify payment.",
      )
    ) {
      return;
    }
    onClose();
  };

  return (
    <>
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
                  Paste both receipt links from your email to verify payment.
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Total Amount
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-2xl font-bold text-green-700">
                    ₦{batchData.totalAmount.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
            {/* Left Panel: Payer Info & Receipt Links */}
            <div className="w-1/3 p-6 overflow-y-auto border-r bg-white space-y-6">
              {/* Payer ID Match Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Important:</strong> Please ensure your Payer ID and Payer Type in your profile match the LASG receipt before making payment.
                </p>
              </div>

              {/* Payer Info Card */}
              <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4" /> Payer Information
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">Payer ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        {batchData.submitter?.payerID || "N/A"}
                      </span>
                      {batchData.submitter?.payerID && (
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-blue-600" onClick={() => handleCopyText(batchData.submitter?.payerID?.toString() || "", "Payer ID")} title="Copy Payer ID">
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Payer ID Type</span>
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
                    <span className="font-medium truncate" title={batchData.submitter?.email}>
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
                    <span className="text-xs text-gray-500 block">Agency Name</span>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                      <span className="font-medium">
                        4830000 -- 61004 -- Office of Surveyor General
                      </span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-blue-600" onClick={() => handleCopyText("4830000 -- 61004 -- Office of Surveyor General", "Agency Name")} title="Copy Agency Name">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Revenue Name</span>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                      <span className="font-medium">
                        4020002 -- 32202 -- Lands Registry Transactions
                      </span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-blue-600" onClick={() => handleCopyText("4020002 -- 32202 -- Lands Registry Transactions", "Revenue Name")} title="Copy Revenue Name">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Period</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {today}
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt Link Inputs */}
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-green-600" />
                    Verify Payment with Receipt Links
                  </label>
                  <p className="text-xs text-gray-500">
                    After payment, Remita sends two receipt links to your email.
                    Paste both links below to verify.
                  </p>
                </div>

                {/* LASG Receipt URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Link 1 — LASG Receipt
                  </label>
                  <input
                    type="url"
                    placeholder="https://printreceipt.ebs-rcm.com/..."
                    className={`w-full h-10 px-3 rounded-md border text-xs focus:outline-none transition-colors ${lasgReceiptUrl && !isValidLasgUrl(lasgReceiptUrl)
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500"
                      }`}
                    value={lasgReceiptUrl}
                    onChange={(e) => setLasgReceiptUrl(e.target.value)}
                  />
                  {lasgReceiptUrl && !isValidLasgUrl(lasgReceiptUrl) && (
                    <p className="text-xs text-red-500">
                      Expected a URL from printreceipt.ebs-rcm.com
                    </p>
                  )}
                </div>

                {/* Remita Receipt URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Link 2 — Remita Receipt
                  </label>
                  <input
                    type="url"
                    placeholder="https://login.remita.net/remita/rrr/..."
                    className={`w-full h-10 px-3 rounded-md border text-xs focus:outline-none transition-colors ${remitaReceiptUrl && !isValidRemitaUrl(remitaReceiptUrl)
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500"
                      }`}
                    value={remitaReceiptUrl}
                    onChange={(e) => setRemitaReceiptUrl(e.target.value)}
                  />
                  {remitaReceiptUrl && !isValidRemitaUrl(remitaReceiptUrl) && (
                    <p className="text-xs text-red-500">
                      Expected a URL from login.remita.net
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleVerifyLinks}
                  disabled={isVerifying || !lasgReceiptUrl || !remitaReceiptUrl}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying Receipts...
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    title="Reload Remita Portal"
                  >
                    <RefreshCw className="w-3 h-3" /> Reload
                  </button>
                  <a
                    href="https://login.remita.net/remita/lirs/internal/pay.reg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 flex items-center hover:underline"
                  >
                    Open in new tab <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
              <iframe
                key={iframeKey}
                src="https://login.remita.net/remita/lirs/internal/pay.reg"
                className="w-full h-full pt-8 border-none"
                title="Remita Payment Portal"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Popup Dialog */}
      <AlertDialog open={!!errorPopup} onOpenChange={() => setErrorPopup(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-red-700 text-base">
                  Verification Failed
                </AlertDialogTitle>
                {errorPopup?.step && (
                  <p className="text-xs font-semibold text-red-500 mt-0.5">
                    {errorPopup.step}
                  </p>
                )}
              </div>
            </div>
            <AlertDialogDescription className="text-sm text-gray-700 mt-2 leading-relaxed">
              {errorPopup?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
