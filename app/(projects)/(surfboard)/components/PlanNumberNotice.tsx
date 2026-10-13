"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { surfboardApi, type PlanNumberMatch } from "@/surfboard/apiClient";
import OptimizedSinglePlanDetails from "./OptimizedSinglePlanDetails";

type Props = {
  /** "warning": a similar number (spacing or a trailing `_` or `.`); "error": exactly the same number on another of the surveyor's plans. */
  severity: "warning" | "error";
  /** The surveyor's own plans only. */
  matches: PlanNumberMatch[];
};

/**
 * The message sits under the plan number field. Clicking a plan opens it in a
 * popup over the form, so nothing typed is lost. Never given another
 * surveyor's plan.
 */
export function PlanNumberNotice({ severity, matches }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (matches.length === 0) return null;
  const isError = severity === "error";

  const open = async (id: string) => {
    setOpenId(id);
    setPlan(null);
    setFailed(false);
    setLoading(true);
    try {
      const res = await surfboardApi.plans.get(id);
      if (res.success) setPlan(res.data);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        role={isError ? "alert" : "status"}
        className={
          isError
            ? "mt-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            : "mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        }
      >
        <p className="flex items-start gap-2 font-medium">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {isError
            ? "You already have a plan with exactly this number."
            : "This looks similar to a plan you already have."}
        </p>
        <ul className="mt-2 space-y-1">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => open(m.id)}
                className="text-left underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {m.planNumber}
                {m.surveyTitle ? ` · ${m.surveyTitle}` : ""} · {m.status.toLowerCase()} · view plan
              </button>
            </li>
          ))}
        </ul>
        {!isError && (
          <p className="mt-2 text-xs opacity-80">
            You can still continue if it is a different plan.
          </p>
        )}
      </div>

      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent
          overlayClassName="z-[500]"
          className="z-[501] max-h-[90vh] max-w-[90%] overflow-y-auto md:max-w-[75%] 2xl:max-w-7xl"
        >
          <DialogHeader>
            <DialogTitle>Existing plan</DialogTitle>
            <DialogDescription>
              Close this window to carry on with your form. Nothing you typed is lost.
            </DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
            </div>
          )}
          {failed && (
            <p className="py-6 text-sm text-red-600">This plan could not be loaded.</p>
          )}
          {plan && <OptimizedSinglePlanDetails planData={plan} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
