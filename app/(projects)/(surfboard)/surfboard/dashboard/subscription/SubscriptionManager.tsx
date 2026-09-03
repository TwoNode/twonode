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
import PaystackPop from "@paystack/inline-js";
import { surfboardApi } from "@/surfboard/apiClient";
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
        const result = await surfboardApi.subscription.get();
        setCurrent((result.success ? result.data : null) || null);
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
      surfboardApi.subscription.get().then((result) => {
        setCurrent(result.success ? result.data : null);
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
      const result = await surfboardApi.subscription.initiate(planId);
      if (!result?.success) {
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

            const verification = await surfboardApi.subscription.verify(reference);

            toast.dismiss("verify-payment");

            if (verification?.success) {
              toast.success("Subscription activated successfully!");
              const updatedSubResult = await surfboardApi.subscription.get();
              setCurrent(updatedSubResult.success ? updatedSubResult.data : null);
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
      const result = await surfboardApi.subscription.disable();

      if (result.success) {
        toast.success(
          "Your subscription will be cancelled at the end of the current billing period"
        );

        setCurrent({
          ...current,
          status: "canceled",
          cancelledAt: new Date(),
          currentEnd: result.data?.data?.currentEnd,
        });

        setShowConfirmation(false);
      } else if (result.error?.toLowerCase().includes("sync pending")) {
        toast.info("Subscription setup is still finalizing. Please try again in 1-2 minutes.");
        setShowConfirmation(false);
      } else {
        toast.error(result.error || "Failed to cancel subscription");
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
      className="space-y-16 pb-20 px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto min-h-screen"
    >
      {/* Premium Hero Section */}
      <motion.div variants={itemVariants} className="relative pt-0 pb-2 text-center">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[600px] h-[400px] bg-blue-500/10 dark:bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen animate-pulse" />
          <div className="absolute w-[500px] h-[300px] bg-purple-500/10 dark:bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen translate-x-20 translate-y-10" />
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-6">
          Plans that scale with{" "}
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            your ambition.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Unlock the full potential of Surfboard. Choose the perfect plan
          tailored to your workflow.
        </p>
      </motion.div>

      {/* VIP Pass Current Plan */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key="current-plan"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative mx-auto max-w-3xl group"
          >
            {/* Outer Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000" />
            
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl shadow-2xl">
              {/* Premium Sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
              
              <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex-1 text-center md:text-left space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold text-sm mb-2">
                    <Crown className="h-4 w-4" />
                    VIP Member
                  </div>
                  <h3 className="text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                    {SUBSCRIPTION_PLANS[current.interval as keyof typeof SUBSCRIPTION_PLANS]?.name || current.planName}
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center gap-3 text-slate-600 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                      {isSubscriptionActive ? "Active Subscription" : "Grace Period"}
                    </span>
                    <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                    <span>{getNextBillingText}</span>
                  </div>
                </div>
                
                {isSubscriptionActive && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0 w-full md:w-auto">
                    <Button
                      variant="ghost"
                      onClick={() => setShowConfirmation(true)}
                      disabled={isDisabling}
                      className="w-full h-12 px-8 rounded-xl font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      {isDisabling ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Cancel Plan"
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Plans */}
      <motion.div variants={itemVariants} className="relative z-10 pt-8">
        <div className="grid lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
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
                className={`relative group h-full flex ${isPopular ? 'lg:-mt-4 lg:mb-4' : ''}`}
              >
                {/* Spotlight Background effect */}
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-slate-200/50 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {isPopular && (
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-blue-500 to-purple-600 rounded-[2rem] z-0 opacity-50 group-hover:opacity-100 transition duration-500" />
                )}

                <div className={`relative z-10 flex flex-col w-full rounded-[2rem] backdrop-blur-xl border transition-all duration-300
                  ${isPopular 
                    ? 'bg-white/90 dark:bg-slate-900/95 border-transparent shadow-2xl' 
                    : 'bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xl'
                  } ${isDisabled && !isCurrent ? 'opacity-60 grayscale-[0.2]' : ''}
                `}>
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles className="h-3.5 w-3.5" />
                        RECOMMENDED
                      </span>
                    </div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`p-3 rounded-2xl shadow-sm ${isPopular ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                        {getPlanIcon(plan.interval)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {plan.name}
                        </h3>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded-full mt-1">
                            <Check className="h-3 w-3" /> Current
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mb-8 leading-relaxed">
                      {plan.description}
                    </p>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                          ₦{plan.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        per {plan.interval === 'quarterly' ? 'quarter' : plan.interval === 'annually' ? 'year' : 'month'}
                      </div>
                      
                      {/* {plan.interval === 'quarterly' && (
                        <div className="mt-3 inline-flex text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 rounded-lg">
                          Save 15% vs monthly
                        </div>
                      )}
                      {plan.interval === 'annually' && (
                        <div className="mt-3 inline-flex text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 rounded-lg">
                          Save 30% vs monthly
                        </div>
                      )} */}
                    </div>

                    <div className="space-y-4 mb-8 flex-1">
                      {[
                        "Full platform access",
                        `Billed ${plan.interval}`,
                        "24/7 Priority support",
                        "Unlimited projects"
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`shrink-0 p-0.5 rounded-full ${isPopular ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      disabled={isDisabled}
                      onClick={() => handlePlanSelect(plan.id)}
                      className={`w-full h-14 rounded-xl font-bold text-base transition-all duration-300 ${
                        isPopular && !isCurrent
                          ? "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xl"
                          : isCurrent
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {isWorking ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isCurrent ? (
                        "Active Plan"
                      ) : (
                        "Select Plan"
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Modern Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md border-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-amber-500" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Cancel Subscription?
              </DialogTitle>
              <DialogDescription className="text-base text-slate-600 dark:text-slate-400 font-medium mt-3">
                To switch plans, you must first cancel your current subscription. 
                Don't worry, you'll retain full access until the end of your billing cycle.
              </DialogDescription>
            </DialogHeader>

            {current?.currentEnd && (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-8 border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
                    <Zap className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Access guaranteed</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Your VIP benefits remain active until {formatLocalDate(current.currentEnd)}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isDisabling}
                size="lg"
                className="w-full sm:w-auto h-12 rounded-xl font-semibold border-slate-200 dark:border-slate-800"
              >
                Keep Plan
              </Button>
              <Button
                onClick={handleDisableSubscription}
                disabled={isDisabling}
                variant="destructive"
                size="lg"
                className="w-full sm:w-auto h-12 rounded-xl font-semibold bg-red-600 hover:bg-red-700"
              >
                {isDisabling ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cancel Plan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin FAB for Development */}
      {process.env.NODE_ENV === "development" && <SubscriptionAdminFAB />}
    </motion.div>
  );
}
