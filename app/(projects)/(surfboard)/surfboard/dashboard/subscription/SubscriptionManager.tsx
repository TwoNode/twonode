"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { Loader2, ArrowRight, Check, Sparkles, Crown, Zap } from "lucide-react";
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
import PaystackPop from "@paystack/inline-js";
import { getUserActiveSubscription } from "../../../actions/subscriptionActions";
import SubscriptionAdminFAB from "./SubscriptionAdminFAB";

// Date utilities
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isAfter = (date1: Date, date2: Date) => date1.getTime() > date2.getTime();

export default function SubscriptionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    []
  );

  const success = searchParams?.get("success");
  const error = searchParams?.get("error");

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const subscription = await getUserActiveSubscription();
        setCurrent(subscription || null);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        toast.error("Failed to load subscription data");
        setCurrent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  // Handle URL params
  useEffect(() => {
    if (success) {
      toast.success("Subscription updated successfully");
      getUserActiveSubscription().then((sub) => {
        setCurrent(sub);
        setPendingPlan(null);
      });
      // Refresh layout
      window.dispatchEvent(new Event("refreshUser"));

      router.refresh(); // Update server components/layout state
      router.replace(pathname);
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        payment_cancelled: "Payment was cancelled",
        payment_verification_failed: "Payment verification failed",
        missing_reference: "Missing payment reference",
        invalid_plan: "Invalid subscription plan",
        invalid_callback: "Invalid callback",
      };
      toast.error(errorMessages[error] || error);
      setPendingPlan(null);
      router.replace(pathname);
    }

    if (error === "payment_cancelled") {
      toast.error("Payment was cancelled");
      setPendingPlan(null);
      router.replace(pathname);
    }
  }, [success, error, router, pathname]);

  const formatLocalDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const isSubscriptionActive = useMemo(() => {
    if (!current) return false;
    return current.status === "active" && !current.cancelledAt;
  }, [current]);

  const isSubscriptionInGracePeriod = useMemo(() => {
    if (!current?.currentEnd) return false;
    const gracePeriodDays = 1;
    const endDate = new Date(current.currentEnd);
    const gracePeriodEnd = addDays(endDate, gracePeriodDays);
    return isAfter(gracePeriodEnd, new Date());
  }, [current]);

  const getSubscriptionStatus = useMemo(() => {
    if (isSubscriptionActive) {
      return `You're currently subscribed to the ${SUBSCRIPTION_PLANS[current?.name as keyof typeof SUBSCRIPTION_PLANS]
          ?.name || current?.planName
        }`;
    }

    if (isSubscriptionInGracePeriod && current?.currentEnd) {
      return `Your subscription will expire on ${formatLocalDate(
        current.currentEnd
      )}`;
    }

    return "You don't have an active subscription";
  }, [current, isSubscriptionActive, isSubscriptionInGracePeriod]);

  const getNextBillingText = useMemo(() => {
    if (!current) return "";

    if (isSubscriptionActive) {
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
  }, [current, isSubscriptionActive, isSubscriptionInGracePeriod]);

  type TransactionObject = {
    reference: string;
    trans: string;
    status: string;
    message: string;
    transaction: string;
    trxref: string;
    redirecturl: string;
  };

  const onSubscribe = async (planId: PlanId) => {
    if (!publicKey) {
      toast.error("Server Error: Misconfigured Payment setup");
      return;
    }

    setPendingPlan(planId);
    try {
      const result = await initiateSubscription(planId);
      if (!result?.success || !result.data) {
        throw new Error(result?.error || "Failed to initiate subscription");
      }

      const { reference, email, amount, currency = "NGN", plan } = result.data;

      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        reference,
        email,
        amount: Math.round(amount * 100),
        currency,
        planCode: plan.plan_code,
        onSuccess: async (transaction: TransactionObject) => {
          try {
            console.log("Payment successful:", transaction);
            toast.loading("Verifying payment...", { id: "verify-payment" });

            const verification = await verifySubscription(reference);

            toast.dismiss("verify-payment");

            if (verification?.success) {
              toast.success("Subscription activated successfully!");
              const updatedSub = await getUserActiveSubscription();
              setCurrent(updatedSub);
              setPendingPlan(null);
              globalThis.location.reload();
            } else {
              throw new Error(verification?.error || "Verification failed");
            }
          } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error.message || "Failed to verify payment");
            setPendingPlan(null);
            router.push(
              `/surfboard/dashboard/subscription?error=${encodeURIComponent(
                error.message || "verification_failed"
              )}`
            );
          }
        },
        onCancel: () => {
          toast.info("Payment cancelled");
          setPendingPlan(null);
        },
        onError: (error: { message: string }) => {
          console.error("Payment error:", error);
          toast.error(error.message || "Payment failed");
          setPendingPlan(null);
        },
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error?.message || "Failed to initiate subscription");
      setPendingPlan(null);
    }
  };

  const handlePlanSelect = (planId: PlanId) => {
    if (isSubscriptionActive) {
      setSelectedPlan(planId);
      setShowConfirmation(true);
      return;
    }

    if (current?.cancelledAt && isSubscriptionInGracePeriod) {
      toast.info(
        `Please wait until ${formatLocalDate(
          current.currentEnd
        )} to subscribe to a new plan`
      );
      return;
    }

    onSubscribe(planId);
  };

  const handleDisableSubscription = async () => {
    if (!current) return;

    setIsDisabling(true);
    try {
      const result = await disableSubscription();

      if (result.success) {
        toast.success(
          "Your subscription will be cancelled at the end of the current billing period"
        );

        setCurrent({
          ...current,
          status: "canceled",
          cancelledAt: new Date(),
          currentEnd: result.data?.currentEnd,
        });

        setShowConfirmation(false);
      } else if (result.error === "sync_pending") {
        toast.info("Subscription setup is still finalizing. Please try again in 1-2 minutes.");
        setShowConfirmation(false);
      } else {
        toast.error(result.message || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("An error occurred while cancelling your subscription");
    } finally {
      setIsDisabling(false);
    }
  };

  const getPlanIcon = (interval: string) => {
    switch (interval) {
      case "monthly":
        return <Zap className="h-5 w-5" />;
      case "quarterly":
        return <Crown className="h-5 w-5" />;
      case "annually":
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Check className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="text-center space-y-3 pt-6">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Choose Your Plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select the perfect subscription plan for your needs. Cancel anytime.
        </p>
      </div>

      {/* Current Plan Card */}
      {current && (
        <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
          <CardHeader className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-blue-600" />
                  Current Plan
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {getSubscriptionStatus}
                </CardDescription>
              </div>
              {isSubscriptionActive && (
                <Badge className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-1.5">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold">
                  {SUBSCRIPTION_PLANS[
                    current.interval as keyof typeof SUBSCRIPTION_PLANS
                  ]?.name || current.planName}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {getNextBillingText}
                </p>
              </div>
              {isSubscriptionActive && (
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirmation(true)}
                  disabled={isDisabling}
                  size="lg"
                  className="shadow-lg"
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
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">
            {isSubscriptionActive
              ? "Switch Plans"
              : isSubscriptionInGracePeriod
                ? "Renew Your Subscription"
                : "Available Plans"}
          </h2>

          <p className="text-muted-foreground">
            {isSubscriptionActive
              ? "Cancel your current plan to subscribe to a new one"
              : isSubscriptionInGracePeriod
                ? `Your current plan expires on ${formatLocalDate(
                  current?.currentEnd
                )}`
                : "Choose the plan that works best for you"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 md:grid-cols-2 grid-cols-1 max-w-7xl mx-auto px-4">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
            const isWorking = pendingPlan === plan.id;
            const isCurrent = current?.planCode === plan.planCode;
            const isPopular = plan.interval === "quarterly";
            const isDisabled =
              isWorking ||
              (isSubscriptionActive && !isCurrent) ||
              !!pendingPlan;

            return (
              <div key={plan.id} className="relative group">
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <Card
                  className={`h-full border-2 transition-all duration-300 ${isCurrent
                      ? "border-blue-600 ring-4 ring-blue-600/20 shadow-xl scale-105"
                      : isPopular
                        ? "border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:shadow-2xl hover:scale-105"
                        : "border-border hover:border-blue-400 hover:shadow-xl hover:scale-105"
                    } ${isPopular ? "pt-8" : "pt-6"} ${isDisabled && !isCurrent ? "opacity-60" : ""
                    }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${isPopular
                              ? "bg-linear-to-br from-purple-500 to-blue-500 text-white"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                            }`}
                        >
                          {getPlanIcon(plan.interval)}
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">
                            {plan.name}
                          </CardTitle>
                        </div>
                      </div>
                      {isCurrent && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          Active
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-6 space-y-6">
                    <div className="border-t border-b py-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          ₦{plan.price.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-lg">
                          /{plan.interval}
                        </span>
                      </div>
                      {plan.interval === "quarterly" && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                          Save 15% compared to monthly
                        </p>
                      )}
                      {plan.interval === "annually" && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                          Save 30% compared to monthly
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-base">
                        <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span>Full access to all features</span>
                      </li>

                      <li className="flex items-center gap-3 text-base">
                        <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span>
                          {plan.interval === "monthly"
                            ? "Monthly"
                            : plan.interval === "quarterly"
                              ? "Quarterly"
                              : "Annual"}{" "}
                          billing
                        </span>
                      </li>

                      <li className="flex items-center gap-3 text-base">
                        <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span>24/7 Priority support</span>
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Button
                      size="lg"
                      disabled={isDisabled}
                      onClick={() => handlePlanSelect(plan.id)}
                      className={`w-full font-semibold text-base h-12 ${isPopular && !isCurrent
                          ? "bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                          : isCurrent
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }`}
                      variant={
                        isCurrent
                          ? "default"
                          : isPopular
                            ? "default"
                            : "default"
                      }
                    >
                      {isWorking ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrent ? (
                        <>
                          <Check className="mr-2 h-5 w-5" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          Get Started
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Cancel Current Subscription?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <p className="text-base">
                  To subscribe to a different plan, you need to cancel your
                  current subscription first. You'll continue to have access
                  until the end of your current billing period.
                </p>

                {current?.currentEnd && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                      Your current plan will remain active until{" "}
                      {formatLocalDate(current.currentEnd)}.
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
                      After that date, you can subscribe to a new plan.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isDisabling}
              size="lg"
            >
              Keep Current Plan
            </Button>
            <Button
              onClick={handleDisableSubscription}
              disabled={isDisabling}
              variant="destructive"
              size="lg"
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

      {/* Admin FAB for Development */}
      {process.env.NODE_ENV === "development" && <SubscriptionAdminFAB />}
    </div>
  );
}
