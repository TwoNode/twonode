"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  FileCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Loader2,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  initiateQRServicePayment,
  verifyQRServicePayment,
} from "../actions/qrEarningsActions";
import { toast } from "sonner";

interface QRPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planNumber: string;
  isCoDAvailable: boolean;
  pricing?: any;
  onPaymentSuccess: (token: string) => void;
}

export default function QRPaywallModal({
  isOpen,
  onClose,
  planId,
  planNumber,
  isCoDAvailable,
  pricing,
  onPaymentSuccess,
}: QRPaywallModalProps) {
  const [selectedService, setSelectedService] = useState<
    "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT"
  >("LOCATION_AUTHENTICITY");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [loading, setLoading] = useState(false);

  // Default fee fallbacks if pricing prop is pending
  const service1Price = pricing?.service1?.verificationFee || 1000;
  const service1Fee =
    service1Price * ((pricing?.service1?.serviceFeePercent || 10) / 100);
  const service1Total = service1Price + service1Fee;

  const service2Price = pricing?.service2?.verificationFee || 2500;
  const service2Fee =
    service2Price * ((pricing?.service2?.serviceFeePercent || 10) / 100);
  const service2Total = service2Price + service2Fee;

  const currentTotal =
    selectedService === "LOCATION_AUTHENTICITY"
      ? service1Total
      : service2Total;

  // Dynamically load Paystack Inline JS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const scriptId = "paystack-inline-js";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, []);

  const handlePaystackPayment = async () => {
    if (!payerEmail || !payerEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await initiateQRServicePayment(
        planId,
        selectedService,
        payerEmail,
        payerName
      );

      if (!res.success || !res.data) {
        toast.error(res.error || "Could not initialize payment");
        setLoading(false);
        return;
      }

      const { reference, amountInKobo, paystackKey } = res.data;

      // Launch Paystack Pop
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        toast.error("Paystack SDK not loaded yet. Please try again.");
        setLoading(false);
        return;
      }

      const handler = PaystackPop.setup({
        key: paystackKey,
        email: payerEmail,
        amount: amountInKobo,
        currency: "NGN",
        ref: reference,
        onClose: () => {
          setLoading(false);
          toast.info("Payment popup closed");
        },
        callback: async (response: any) => {
          toast.loading("Verifying payment...");
          const verifyRes = await verifyQRServicePayment(
            reference,
            response.reference
          );

          if (verifyRes.success && verifyRes.accessToken) {
            toast.dismiss();
            toast.success("Payment successful! Unlocking 1-hour access.");
            onPaymentSuccess(verifyRes.accessToken);
          } else {
            toast.dismiss();
            toast.error(verifyRes.error || "Payment verification failed");
          }
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (err: any) {
      console.error("Paywall Checkout Error:", err);
      toast.error(err.message || "Payment initiation failed");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-slate-900 border-slate-800 text-white shadow-2xl">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Unlock Survey Plan Access
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-1 text-sm">
            Survey Plan #{planNumber} • Free scan quota reached
          </DialogDescription>
        </div>

        {/* Service Options */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Service to Purchase (1-Hour Full Access)
          </Label>

          {/* Service 1 */}
          <div
            onClick={() => setSelectedService("LOCATION_AUTHENTICITY")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedService === "LOCATION_AUTHENTICITY"
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    selectedService === "LOCATION_AUTHENTICITY"
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-base">
                    Service 1: Know Actual Location
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Interactive map, GPS directions & authenticity check
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  ₦{service1Total.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">
                  incl. service fee
                </span>
              </div>
            </div>
          </div>

          {/* Service 2 */}
          <div
            onClick={() => setSelectedService("CERTIFICATE_OF_DEPOSIT")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedService === "CERTIFICATE_OF_DEPOSIT"
                ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    selectedService === "CERTIFICATE_OF_DEPOSIT"
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-base">
                      Service 2: Access CoD
                    </h4>
                    {isCoDAvailable ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        Available Now
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                        Pending OSSG Lodging
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Download official Certificate of Deposit issued by OSSG
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  ₦{service2Total.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">
                  incl. service fee
                </span>
              </div>
            </div>
          </div>

          {/* User Email & Name Inputs */}
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-slate-300">
                Email Address (Receipt & Access Confirmation)
              </Label>
              <Input
                type="email"
                placeholder="your.name@example.com"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">
                Full Name (Optional)
              </Label>
              <Input
                type="text"
                placeholder="John Doe"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 1-Hour Access Notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Purchased access remains valid for <strong>1 Hour</strong> from
              confirmation.
            </span>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handlePaystackPayment}
            disabled={loading}
            className="w-full py-6 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Checkout...
              </>
            ) : (
              <>
                Pay ₦{currentTotal.toLocaleString()} via Paystack
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
