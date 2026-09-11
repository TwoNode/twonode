"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Home } from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("error");
        setMessage("No payment reference found");
        return;
      }

      try {
        // batchId is unused server-side — verifyBatchPayment looks the batch up by reference
        const result = await surfboardApi.cod.batches.verifyPayment(
          "_",
          reference,
        );

        if (result.success) {
          setStatus("success");
          setMessage(
            "Your payment has been verified! Your Certificate of Deposit request is now being processed."
          );
          toast.success("Payment verified successfully!");
        } else {
          setStatus("error");
          setMessage(
            result.error ||
              "Payment verification failed. Please contact support."
          );
          toast.error(result.error || "Payment verification failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("error");
        setMessage("An error occurred while verifying payment");
        toast.error("Payment verification error");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-white/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying Payment</CardTitle>
              <CardDescription>
                Please wait while we verify your payment...
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="w-16 h-16 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-green-700">
                Payment Successful!
              </CardTitle>
              <CardDescription className="text-green-600">
                Thank you for your payment
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <XCircle className="w-16 h-16 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-red-700">
                Payment Issue
              </CardTitle>
              <CardDescription className="text-red-600">
                We encountered an issue with your payment
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-400">{message}</p>

          {status === "success" && (
            <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-lg text-sm text-green-800 dark:text-green-300">
              <p className="font-medium mb-2">What happens next?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Our team will process your request within 3-5 business days
                </li>
                <li>You will receive updates via email and notifications</li>
                <li>
                  Once approved, your certificate will be ready for collection
                </li>
              </ul>
            </div>
          )}

          {status === "error" && (
            <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-lg text-sm text-red-800 dark:text-red-300">
              <p className="font-medium mb-2">Need help?</p>
              <p>
                If you believe this is an error, please contact our support team
                with your payment reference.
              </p>
            </div>
          )}

          <Button
            onClick={() => router.push("/surfboard/dashboard/plans")}
            className="w-full"
            disabled={status === "loading"}
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-white/5">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
