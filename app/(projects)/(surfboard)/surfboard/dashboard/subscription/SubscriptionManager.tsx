"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SUBSCRIPTION_PLANS,
  type PlanId,
} from "@/app/(projects)/(surfboard)/utils/paystackSubscription";
import {
  initiateSubscription,
  verifySubscription,
  disableSubscription,
} from "@/app/(projects)/(surfboard)/actions/paystackActions";
import { isAfter, addDays } from "date-fns";
import PaystackPop from "@paystack/inline-js";
import { getUserActiveSubscription } from "../../../actions/subscriptionActions";

/**
 * SubscriptionManager
 *
 * Inline (same-page) payment flow using Paystack InlineJS.
 * - Calls backend to initialize & get reference/amount/email.
 * - Starts Paystack popup on the same page (no redirect to authorization_url).
 * - Closes popup and refreshes data on success/cancel.
 */
export default function SubscriptionManager({
  searchParams,
  sub,
}: {
  searchParams: { success?: string; error?: string };
  sub: any;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableStatus, setDisableStatus] = useState<{
    message: string;
    dueDate: Date | null;
    isDisabled: boolean;
  } | null>(null);

  // Guard public key early
  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    []
  );

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const sub = await getUserActiveSubscription();
        setCurrent(sub || null);
        setIsSubscriptionActive(sub?.status === "active" && !sub?.cancelledAt);
      } catch {
        setCurrent(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSub();
  }, []);

  useEffect(() => {
    const { success, error } = searchParams || {};
    if (success) {
      toast.success("Subscription updated successfully");
      router.replace(pathname);
    }
    if (error) {
      const map: Record<string, string> = {
        payment_cancelled: "Payment was cancelled",
        payment_verification_failed: "Payment verification failed",
        missing_reference: "Missing payment reference",
        invalid_plan: "Invalid subscription plan",
        invalid_callback: "Invalid callback",
      };
      toast.error(map[error] || error);
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  const nairaToKobo = (naira: number) => Math.round(naira * 100);

  const formatLocalDate = (
    dateString: string | Date | null | undefined,
    formatStr = "MMM d, yyyy"
  ) => {
    if (!dateString) return "N/A";
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;

      // For the format string, we'll use Intl.DateTimeFormat for the timezone conversion
      // and fall back to the original format function for custom formatting
      const timeZone = "Africa/Lagos";

      // First convert the date to the target timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      // If we need to support custom format strings, we'll need to handle them
      // For now, we'll use the default format
      return formatter.format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const isSubscriptionActiveMemo = useMemo(() => {
    if (!current) return false;
    if (current.status === "active" && !current.cancelledAt) return true;
    return false;
  }, [current]);

  const isSubscriptionInGracePeriod = useMemo(() => {
    if (!current?.currentEnd) return false;
    const gracePeriodDays = 1; // 1 day grace period
    const endDate = new Date(current.currentEnd);
    const gracePeriodEnd = addDays(endDate, gracePeriodDays);
    return isAfter(gracePeriodEnd, new Date());
  }, [current]);

  const getSubscriptionStatus = useMemo(() => {
    if (isSubscriptionActiveMemo) {
      return `You're currently subscribed to the ${
        SUBSCRIPTION_PLANS[current?.interval as keyof typeof SUBSCRIPTION_PLANS]
          ?.name || current?.planName
      }`;
    }

    if (isSubscriptionInGracePeriod && current?.currentEnd) {
      return `Your subscription will expire on ${formatLocalDate(
        current.currentEnd
      )}`;
    }

    return "You don't have an active subscription";
  }, [current, isSubscriptionActiveMemo, isSubscriptionInGracePeriod]);

  const getNextBillingText = useMemo(() => {
    if (!current) return "";

    if (isSubscriptionActiveMemo) {
      if (current.nextPaymentDate || current.currentEnd) {
        return `Next billing: ${formatLocalDate(
          current.nextPaymentDate || current.currentEnd
        )}`;
      }
      return `Billing cycle: ${current.interval || "monthly"}`;
    }

    if (isSubscriptionInGracePeriod && current.currentEnd) {
      return `Expires on ${formatLocalDate(current.currentEnd)}`;
    }

    return "No active subscription";
  }, [current, isSubscriptionActiveMemo, isSubscriptionInGracePeriod]);

  const onSubscribe = async (planId: PlanId) => {
    if (!publicKey) {
      toast.error("Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY");
      return;
    }

    setPendingPlan(planId);
    try {
      const result = await initiateSubscription(planId);
      if (!(result?.success && result.data)) {
        throw new Error(result?.error || "Failed to initiate subscription");
      }

      const {
        reference,
        email,
        amount,
        currency = "NGN",
        planCode,
        userId,
      } = result.data as {
        reference: string;
        email: string;
        amount: number; // expected in NGN
        planCode: string;
        currency?: string;
        userId: string;
      };

      const paystack = new PaystackPop();

      // Why: Keep all side effects centralized to ensure refresh even if user cancels.
      const refreshAfter = () => {
        try {
          router.refresh();
        } catch {}
      };

      paystack.newTransaction({
        key: publicKey,
        reference,
        email,
        amount: nairaToKobo(amount),
        currency,
        planCode,
        metadata: {
          custom_fields: [
            {
              display_name: "Subscription Plan",
              variable_name: "subscription_plan",
              value: planId,
            },
            {
              display_name: "Subscription Plan ID",
              variable_name: "subscription_plan_id",
              value: planId,
            },
            {
              display_name: "Plan Code",
              variable_name: "plan_code",
              value: planCode,
            },
            {
              display_name: "Platform",
              variable_name: "platform",
              value: "surfboard",
            },
            {
              display_name: "Reference",
              variable_name: "reference",
              value: reference,
            },
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId,
            },
            { display_name: "Email", variable_name: "email", value: email },
          ].filter(Boolean) as {
            display_name: string;
            variable_name: string;
            value?: string | number | undefined;
          }[],
        },
        onLoad: () => {
          toast.loading("Preparing payment...", { id: "payment-loading" });
        },
        onSuccess: async (txn) => {
          try {
            console.log("Payment successful!", txn);
            toast.dismiss("payment-loading");
            toast.success("Payment successful! Verifying...");

            if (!reference) {
              toast.error("Invalid payment reference");
              return router.replace(
                "/surfboard/dashboard/subscription?error=invalid_reference"
              );
            }

            // Verify the subscription with the backend
            const verification = await verifySubscription(reference);
            console.log("Payment verification result:", verification);

            if (!verification?.success) {
              const errorMsg =
                verification?.error || "Payment verification failed";
              toast.error(errorMsg);
              // return router.replace(
              //   `/surfboard/dashboard/subscription?error=${encodeURIComponent(
              //     errorMsg
              //   )}`
              // );
            }

            // Show success and redirect
            toast.success("Subscription updated successfully!");
            // router.replace("/surfboard/dashboard/subscription?success=true");
            // refreshAfter();
          } catch (error: any) {
            console.error("Payment processing error:", error);
            const errorMsg = error?.message || "An unexpected error occurred";
            toast.error(errorMsg);
            router.replace(
              `/surfboard/dashboard/subscription?error=${encodeURIComponent(
                errorMsg
              )}`
            );
          }
        },
        onCancel: () => {
          toast.dismiss("payment-loading");
          toast.info("Payment was cancelled");
          router.replace(
            "/surfboard/dashboard/subscription?error=payment_cancelled"
          );
        },
        onError: (err: { message: string }) => {
          toast.dismiss("payment-loading");
          const errorMsg = err?.message || "Payment processing failed";
          console.error("Payment error:", errorMsg);
          toast.error(errorMsg);
          router.replace(
            `/surfboard/dashboard/subscription?error=${encodeURIComponent(
              errorMsg
            )}`
          );
        },
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(
        error?.message || "Failed to initiate subscription. Please try again."
      );
      alert("Failed to initiate subscription. Please try again.");
    } finally {
      setPendingPlan(null);
    }
  };

  const handlePlanSelect = (planId: PlanId) => {
    if (current?.planCode === planId) {
      // If it's the current plan, just manage it
      onSubscribe(planId);
      return;
    }

    // If user has an active subscription, show disable confirmation first
    if (current?.status === "active" && !current?.cancelledAt) {
      setSelectedPlan(planId);
      setShowConfirmation(true);
    } else if (current?.cancelledAt) {
      // If subscription is already cancelled but not yet expired
      toast.error(
        `Your current plan is set to expire on ${formatLocalDate(
          current.currentEnd
        )}. ` +
          "Please wait until the plan expires before subscribing to a new one."
      );
    } else {
      // No active subscription or subscription already expired
      onSubscribe(planId);
    }
  };

  const handleDisableSubscription = async () => {
    if (!current) return;

    setIsDisabling(true);
    try {
      const result = await disableSubscription();

      if (result.success) {
        setDisableStatus({
          message: result.message,
          dueDate: result.data?.currentEnd || null,
          isDisabled: true,
        });

        // Update current subscription status
        setCurrent({
          ...current,
          status: "canceled",
          cancelledAt: new Date(),
          currentEnd: result.data?.currentEnd,
        });

        toast.success(
          "Your subscription will be canceled at the end of the current billing period."
        );
      } else {
        toast.error(result.message || "Failed to disable subscription");
      }
    } catch (error) {
      console.error("Error disabling subscription:", error);
      toast.error("An error occurred while disabling your subscription");
    } finally {
      setIsDisabling(false);
      setShowConfirmation(false);
    }
  };

  const handleConfirmChange = async () => {
    if (!selectedPlan) return;

    setIsConfirming(true);
    try {
      await onSubscribe(selectedPlan);
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error changing plan:", error);
      toast.error("Failed to change plan. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      {current && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>{getSubscriptionStatus}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {SUBSCRIPTION_PLANS[
                    current.interval as keyof typeof SUBSCRIPTION_PLANS
                  ]?.name || current.planName}
                </h3>
                <p className="text-muted-foreground">{getNextBillingText}</p>
              </div>
              {isSubscriptionActiveMemo && (
                <Button
                  variant="destructive"
                  onClick={handleDisableSubscription}
                  disabled={isDisabling}
                >
                  {isDisabling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Cancel Subscription"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            {isSubscriptionActiveMemo
              ? "Cancel your current plan to subscribe to a new one"
              : isSubscriptionInGracePeriod
              ? `Your current plan will expire on ${
                  current ? formatLocalDate(current.currentEnd) : ""
                }`
              : "Choose the plan that works best for you"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6 justify-center items-center content-center place-content-center place-items-center md:grid-cols-2 grid-cols-1">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
              const isWorking = pendingPlan === plan.id;
              const isCurrent = current?.planCode === plan.planCode;
              const isPopular = plan.interval === "quarterly"; // Mark the 'pro' plan as popular

              return (
                <div key={plan.id} className="relative">
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-md">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <Card
                    className={`border-2 transition-all duration-300 hover:shadow-lg ${
                      isCurrent
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    } ${isPopular ? "relative pt-10 pb-6 shadow-lg" : ""}`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-bold text-foreground">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {plan.description}
                          </CardDescription>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Current Plan
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pb-6">
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-foreground">
                          ₦{plan.price.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          /{plan.interval}
                        </span>
                      </div>

                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          Full access to all features
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          {plan.interval === "monthly"
                            ? "Monthly"
                            : plan.interval === "quarterly"
                            ? "Quarterly"
                            : "Annual"}{" "}
                          billing
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          24/7 Priority support
                        </li>
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button
                        size="lg"
                        disabled={isWorking || isSubscriptionActiveMemo}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={`w-full font-medium transition-all text-white ${
                          isPopular
                            ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-blue-200"
                            : ""
                        }`}
                      >
                        {isWorking ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {isCurrent ? "Manage Plan" : "Get Started"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <p>
                  To change your plan, you need to first cancel your current
                  subscription. You'll continue to have access until the end of
                  your current billing period.
                </p>

                {current?.currentEnd && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                      Your current plan will remain active until{" "}
                      {formatLocalDate(current.currentEnd)}.
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                      You can subscribe to a new plan after your current
                      subscription ends.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isDisabling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisableSubscription}
              disabled={isDisabling}
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
