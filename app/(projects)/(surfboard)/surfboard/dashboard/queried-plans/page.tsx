"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Loader2, Edit3, ArrowLeft } from "lucide-react";
import { getQueriedPlansForUser } from "../../../actions/codActions";
import { AmendPlanModal } from "../../../components/AmendPlanModal";
import Link from "next/link";

interface QueriedPlan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  deededArea: string;
  pillars: any;
  redCopyFileUrl: string | null;
  redCopyStatus: string;
  surconStatus: string;
  surconComment: string | null;
  recordsIStatus: string;
  recordsIComment: string | null;
  recordsIIStatus: string;
  recordsIIComment: string | null;
  batch: {
    batchCode: string;
  } | null;
}

export default function QueriedPlansPage() {
  const [plans, setPlans] = useState<QueriedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<QueriedPlan | null>(null);
  const [amendModalOpen, setAmendModalOpen] = useState(false);

  useEffect(() => {
    fetchQueriedPlans();
  }, []);

  const fetchQueriedPlans = async () => {
    try {
      setLoading(true);
      const result = await getQueriedPlansForUser();
      if (result.success && result.data) {
        setPlans(result.data.plans as any);
      } else {
        toast.error(result.error || "Failed to fetch queried plans");
      }
    } catch (error) {
      console.error("Error fetching queried plans:", error);
      toast.error("An error occurred while fetching queried plans");
    } finally {
      setLoading(false);
    }
  };

  const handleAmendClick = (plan: QueriedPlan) => {
    setSelectedPlan(plan);
    setAmendModalOpen(true);
  };

  const handleAmendSuccess = () => {
    setAmendModalOpen(false);
    setSelectedPlan(null);
    fetchQueriedPlans();
  };

  // Determine which role(s) queried the plan
  const getQueriedBy = (plan: QueriedPlan): string[] => {
    const roles: string[] = [];
    if (plan.surconStatus === "QUERIED") roles.push("SURCON");
    if (plan.recordsIStatus === "QUERIED") roles.push("Records I");
    if (plan.recordsIIStatus === "QUERIED") roles.push("Records II");
    return roles;
  };

  // Get query comments from all querying roles
  const getQueryComments = (
    plan: QueriedPlan
  ): Array<{ role: string; comment: string }> => {
    const comments: Array<{ role: string; comment: string }> = [];
    if (plan.surconStatus === "QUERIED" && plan.surconComment) {
      comments.push({ role: "SURCON", comment: plan.surconComment });
    }
    if (plan.recordsIStatus === "QUERIED" && plan.recordsIComment) {
      comments.push({ role: "Records I", comment: plan.recordsIComment });
    }
    if (plan.recordsIIStatus === "QUERIED" && plan.recordsIIComment) {
      comments.push({ role: "Records II", comment: plan.recordsIIComment });
    }
    return comments;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading queried plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/surfboard/dashboard/plans">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Queried Plans</h1>
          <p className="text-gray-600 mt-1">
            Plans that require amendments before resubmission
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Amendment Required
          </p>
          <p className="text-sm text-amber-700 mt-1">
            These plans were queried by MDA admins and require corrections. You
            can edit the pillars and/or upload a new record copy, then resubmit
            for review.
          </p>
        </div>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No queried plans</p>
            <p className="text-gray-400 text-sm mt-2">
              All your plans are in good standing
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const queriedBy = getQueriedBy(plan);
            const queryComments = getQueryComments(plan);

            return (
              <Card key={plan.id} className="border-2 border-amber-200">
                <CardHeader className="bg-amber-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <CardTitle className="text-xl">
                          {plan.planNumber}
                        </CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        {plan.surveyTitle}
                      </CardDescription>
                      {plan.batch && (
                        <div className="mt-2">
                          <Badge variant="outline">
                            Batch: {plan.batch.batchCode}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {queriedBy.map((role) => (
                        <Badge
                          key={role}
                          className="bg-amber-100 text-amber-700"
                        >
                          Queried by: {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Location Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">LGA</p>
                      <p className="text-sm font-medium">{plan.lga || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ward</p>
                      <p className="text-sm font-medium">
                        {plan.ward || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">LCDA</p>
                      <p className="text-sm font-medium">
                        {plan.lcda || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Deeded Area</p>
                      <p className="text-sm font-medium">{plan.deededArea}</p>
                    </div>
                  </div>

                  {/* Query Comments */}
                  {queryComments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Query Reasons:
                      </p>
                      {queryComments.map((item, index) => (
                        <div
                          key={index}
                          className="bg-red-50 border border-red-200 p-3 rounded-lg"
                        >
                          <p className="text-xs font-medium text-red-800 mb-1">
                            {item.role}
                          </p>
                          <p className="text-sm text-red-700">{item.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => handleAmendClick(plan)}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Amend & Resubmit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Amend Modal */}
      {selectedPlan && (
        <AmendPlanModal
          open={amendModalOpen}
          onOpenChange={setAmendModalOpen}
          plan={selectedPlan}
          onSuccess={handleAmendSuccess}
        />
      )}
    </div>
  );
}
