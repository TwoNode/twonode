"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { verifySubscription } from "@/app/(projects)/(surboard)/actions/paystackActions";

export default function SubscriptionCallback({ reference }: { reference: string }) {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        if (!reference) return router.replace("/surfboard/dashboard/subscription?error=invalid_callback");
        const res = await verifySubscription(reference);
        if (res?.success)
          router.replace("/surfboard/dashboard/subscription?success=true");
        else
          router.replace(
            "/surfboard/dashboard/subscription?error=payment_verification_failed"
          );
      } catch (err: any) {
        router.replace(
          `/surfboard/dashboard/subscription?error=${encodeURIComponent(
            err?.message || "payment_verification_failed"
          )}`
        );
      }
    })();
  }, [reference, router]);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="h-12 w-12 animate-spin" />
      <p className="mt-4 text-lg font-semibold">Verifying your subscription…</p>
      <p className="text-muted-foreground">Please do not close this page.</p>
    </div>
  );
}
