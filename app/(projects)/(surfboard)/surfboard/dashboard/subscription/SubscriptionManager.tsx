"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence, Variants } from "framer-motion";
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
      return `You're currently subscribed to the ${SUBSCRIPTION_PLANS[current?.interval as keyof typeof SUBSCRIPTION_PLANS]
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 relative z-10 mx-auto" />
          </div>
          <p className="text-muted-foreground font-medium">Loading subscription plans...</p>
        </motion.div>
      </div>
    );
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="text-center space-y-4 pt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient-x pb-1">
          Choose Your Plan
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Select the perfect subscription plan for your needs. Cancel anytime.
        </p>
      </motion.div>

      {/* Current Plan Card */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key="current-plan"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden rounded-2xl p-0.5 max-w-4xl mx-auto"
          >
            {/* Animated glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-blue-500/30 animate-pulse" />
            
            <Card className="relative border border-white/20 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl shadow-xl">
              <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-3 font-bold">
                      <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm">
                        <Crown className="h-6 w-6" />
                      </div>
                      Current VIP Plan
                    </CardTitle>
                    <CardDescription className="text-base mt-2 font-medium">
                      {getSubscriptionStatus}
                    </CardDescription>
                  </div>
                  {isSubscriptionActive && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 font-semibold shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Active
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                      {SUBSCRIPTION_PLANS[
                        current.interval as keyof typeof SUBSCRIPTION_PLANS
                      ]?.name || current.planName}
                    </h3>
                    <p className="text-muted-foreground text-lg flex items-center gap-2 font-medium">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {getNextBillingText}
                    </p>
                  </div>
                  {isSubscriptionActive && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="destructive"
                        onClick={() => setShowConfirmation(true)}
                        disabled={isDisabling}
                        size="lg"
                        className="shadow-lg hover:shadow-red-500/20 transition-all duration-300 h-12 px-8 rounded-xl font-semibold text-base border border-red-500/20"
                      >
                        {isDisabling ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Cancel Subscription"
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Plans */}
      <motion.div variants={itemVariants} className="space-y-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">
            {isSubscriptionActive
              ? "Switch Plans"
              : isSubscriptionInGracePeriod
                ? "Renew Your Subscription"
                : "Available Plans"}
          </h2>

          <p className="text-muted-foreground text-lg">
            {isSubscriptionActive
              ? "Cancel your current plan to subscribe to a new one"
              : isSubscriptionInGracePeriod
                ? `Your current plan expires on ${formatLocalDate(
                  current?.currentEnd
                )}`
                : "Choose the plan that works best for you"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 md:grid-cols-2 grid-cols-1">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
            const isWorking = pendingPlan === plan.id;
            const isCurrent = current?.planCode === plan.planCode;
            const isPopular = plan.interval === "quarterly";
            const isDisabled =
              isWorking ||
              (isSubscriptionActive && !isCurrent) ||
              !!pendingPlan;

            return (
              <motion.div 
                key={plan.id} 
                variants={itemVariants}
                whileHover={!isDisabled ? { y: -8 } : {}}
                className="relative group h-full"
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 ring-2 ring-white dark:ring-slate-900">
                      <Sparkles className="h-3.5 w-3.5" />
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                {/* Ambient Glow for Popular Plan */}
                {isPopular && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition duration-500" />
                )}

                <Card
                  className={`relative h-full flex flex-col border transition-all duration-500 overflow-hidden rounded-2xl
                    ${isCurrent
                      ? "border-blue-500/50 bg-blue-50/80 dark:bg-blue-950/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
                      : isPopular
                        ? "border-purple-500/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl"
                        : "border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl hover:shadow-xl hover:border-blue-500/30"
                    } ${isPopular ? "pt-8" : "pt-6"} ${isDisabled && !isCurrent ? "opacity-60 grayscale-[0.3]" : ""
                    }`}
                >
                  <CardHeader className="pb-4 shrink-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl shadow-sm border ${isPopular
                              ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white border-transparent"
                              : "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700"
                            }`}
                        >
                          {getPlanIcon(plan.interval)}
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold tracking-tight">
                            {plan.name}
                          </CardTitle>
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-bold border border-green-500/20">
                          <Check className="h-3 w-3" /> Active
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-base leading-relaxed font-medium">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-6 space-y-6 flex-grow">
                    <div className="py-6 border-y border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl lg:text-5xl font-extrabold tracking-tight">
                          ₦{plan.price.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground font-medium text-lg">
                          /{plan.interval}
                        </span>
                      </div>
                      {plan.interval === "quarterly" && (
                        <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800/30">
                          <Zap className="h-4 w-4 text-amber-500" /> Save 15% compared to monthly
                        </div>
                      )}
                      {plan.interval === "annually" && (
                        <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800/30">
                          <Zap className="h-4 w-4 text-amber-500" /> Save 30% compared to monthly
                        </div>
                      )}
                    </div>

                    <ul className="space-y-4">
                      <li className="flex items-start gap-3 text-base">
                        <div className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 p-1 mt-0.5">
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">Full access to all features</span>
                      </li>

                      <li className="flex items-start gap-3 text-base">
                        <div className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 p-1 mt-0.5">
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {plan.interval === "monthly"
                            ? "Monthly"
                            : plan.interval === "quarterly"
                              ? "Quarterly"
                              : "Annual"}{" "}
                          billing
                        </span>
                      </li>

                      <li className="flex items-start gap-3 text-base">
                        <div className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 p-1 mt-0.5">
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">24/7 Priority support</span>
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-0 shrink-0">
                    <motion.div className="w-full" whileTap={!isDisabled ? { scale: 0.97 } : {}}>
                      <Button
                        size="lg"
                        disabled={isDisabled}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={`w-full font-bold text-base h-14 rounded-xl shadow-md transition-all ${
                          isPopular && !isCurrent
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/25 border-0"
                            : isCurrent
                              ? "bg-green-600 hover:bg-green-700 text-white border-0"
                              : "border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                          }`}
                        variant={
                          isCurrent
                            ? "default"
                            : isPopular
                              ? "default"
                              : "outline"
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
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Cancel Current Subscription?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
                  To subscribe to a different plan, you need to cancel your
                  current subscription first. You'll continue to have access
                  until the end of your current billing period.
                </p>

                {current?.currentEnd && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
                    <p className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Your current plan will remain active until{" "}
                      {formatLocalDate(current.currentEnd)}.
                    </p>
                    <p className="text-amber-700 dark:text-amber-400/80 text-sm mt-2 ml-6">
                      After that date, you can subscribe to a new plan.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-0 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isDisabling}
              size="lg"
              className="font-semibold rounded-xl h-12"
            >
              Keep Current Plan
            </Button>
            <Button
              onClick={handleDisableSubscription}
              disabled={isDisabling}
              variant="destructive"
              size="lg"
              className="font-semibold rounded-xl h-12 shadow-lg shadow-red-500/20"
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
    </motion.div>
  );
}
