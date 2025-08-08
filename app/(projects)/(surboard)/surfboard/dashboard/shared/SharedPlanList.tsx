"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAllSurfPlans,
  updateSurfPlanStatus,
  deleteSurfPlan,
} from "@/app/(projects)/(surboard)/actions/surfboardActions";
import type { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, FileText, Calendar, ArrowRight, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface PlanWithPillars extends Plan {
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  areaSqM?: number;
  pdfFilePath: string | null;
  cadFilePath: string | null;
  certificateFilePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  pillars: Array<{
    pillarNumber: string;
    easting: number;
    northing: number;
    pointIndex: number;
  }>;
}

const statusVariant = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "destructive",
  UNDER_REVIEW: "default",
} as const;

const statusLabels = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  UNDER_REVIEW: "Under Review",
} as const;

export default function PlanList({ plans, emptyMessage }: { plans: Plan[]; emptyMessage: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const result = await getAllSurfPlans();
      if (result?.success && result?.data) {
      } else {
        toast.error(result.error || "Failed to load plans");
      }
    } catch (error) {
      toast.error("Error loading plans");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    planId: string,
    newStatus: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW"
  ) => {
    setUpdating(planId);
    try {
      const result = await updateSurfPlanStatus(planId, newStatus);
      if (result.success) {
        toast.success("Status updated successfully");
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (planId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this plan? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const result = await deleteSurfPlan(planId);
      if (result.success) {
        toast.success("Plan deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete plan");
      }
    } catch (error) {
      toast.error("Error deleting plan");
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage || "No plans found"}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-semibold line-clamp-1">
                  {plan.surveyTitle || `Plan ${plan.planNumber}`}
                </CardTitle>
                <CardDescription className="text-sm">
                  {plan.planNumber}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/surfboard/dashboard/plan?planId=${plan.id}`} className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/surfboard/dashboard/plan/edit?planId=${plan.id}`} className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      Edit Plan
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-2">
              <Badge variant={statusVariant[plan.status]}>
                {statusLabels[plan.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-3 text-sm">
              {plan.surveyTitle && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="line-clamp-1">{plan.surveyTitle}</div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  Updated {format(new Date(plan.updatedAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button variant="outline" size="sm" className="w-full group" asChild>
              <Link href={`/surfboard/dashboard/plan/${plan.id}`}>
                View Details
                <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
