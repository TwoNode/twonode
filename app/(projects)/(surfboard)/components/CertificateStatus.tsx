/**
 * Certificate of Deposit Status Component
 * Displays batch submission status and approval progress for a plan
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface CertificateStatusProps {
  batchId?: string | null;
  batchCode?: string | null;
  batchPaymentStatus?: string | null;
  accountsStatus?: string | null;
  chartingStatus?: string | null;
  surconStatus?: string | null;
  recordsIStatus?: string | null;
  recordsIIStatus?: string | null;
  accountsComment?: string | null;
  chartingComment?: string | null;
  surconComment?: string | null;
  recordsIComment?: string | null;
  recordsIIComment?: string | null;
}

export function CertificateOfDepositStatus({
  batchId,
  batchCode,
  batchPaymentStatus,
  accountsStatus,
  chartingStatus,
  surconStatus,
  recordsIStatus,
  recordsIIStatus,
  accountsComment,
  chartingComment,
  surconComment,
  recordsIComment,
  recordsIIComment,
}: CertificateStatusProps) {
  // If not part of a batch, don't show anything
  if (!batchId) {
    return null;
  }

  const approvalStages = [
    {
      name: "Accounts",
      status: accountsStatus,
      comment: accountsComment,
      description: "LASG payment verification",
    },
    {
      name: "Charting",
      status: chartingStatus,
      comment: chartingComment,
      description: "Charting remarks confirmation",
    },
    {
      name: "SURCON",
      status: surconStatus,
      comment: surconComment,
      description: "Pillar numbers verification",
    },
    {
      name: "Records I",
      status: recordsIStatus,
      comment: recordsIComment,
      description: "Record copy verification",
    },
    {
      name: "Records II",
      status: recordsIIStatus,
      comment: recordsIIComment,
      description: "Physical copy verification",
    },
  ];

  const getStatusIcon = (status?: string | null) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "QUERIED":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "PENDING":
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700 border-green-200";
      case "QUERIED":
        return "bg-red-100 text-red-700 border-red-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPaymentStatusColor = (status?: string | null) => {
    switch (status) {
      case "COMPLETED":
      case "ACCOUNTS_APPROVED":
        return "bg-green-100 text-green-700 border-green-200";
      case "ACCOUNTS_DISAPPROVED":
        return "bg-red-100 text-red-700 border-red-200";
      case "USER_PAID":
      case "LASG_PAID":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PENDING_USER_PAYMENT":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const approvedCount = approvalStages.filter(
    (stage) => stage.status === "APPROVED"
  ).length;
  const totalStages = approvalStages.length;
  const progressPercentage = (approvedCount / totalStages) * 100;

  return (
    <Card className="border-2 border-blue-200 bg-linear-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Certificate of Deposit Status
          </CardTitle>
          {batchCode && (
            <Link
              href={`/surf-restricted/dashboard/certificates/${batchId}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              View Batch
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Batch Info */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
          <div>
            <p className="text-sm text-gray-600">Batch Code</p>
            <p className="text-lg font-semibold text-gray-900">{batchCode}</p>
          </div>
          {batchPaymentStatus && (
            <Badge
              className={`px-3 py-1 ${getPaymentStatusColor(
                batchPaymentStatus
              )}`}
            >
              {batchPaymentStatus.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Approval Progress</span>
            <span className="text-gray-600">
              {approvedCount} of {totalStages} stages completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Approval Stages */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Approval Stages
          </h4>
          <div className="space-y-2">
            {approvalStages.map((stage, index) => (
              <div
                key={stage.name}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="shrink-0 mt-0.5">
                  {getStatusIcon(stage.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {stage.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {stage.description}
                      </p>
                    </div>
                    <Badge
                      className={`px-2 py-0.5 text-xs ${getStatusColor(
                        stage.status
                      )}`}
                    >
                      {stage.status || "PENDING"}
                    </Badge>
                  </div>
                  {stage.comment && stage.status === "QUERIED" && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <p>{stage.comment}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> All approval stages must be completed before
            your plan can be lodged. If any stage is queried, you may need to
            provide additional information or corrections.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for list/grid views
 */
export function CertificateStatusBadge({
  batchCode,
  accountsStatus,
  chartingStatus,
  surconStatus,
  recordsIStatus,
  recordsIIStatus,
}: Pick<
  CertificateStatusProps,
  | "batchCode"
  | "accountsStatus"
  | "chartingStatus"
  | "surconStatus"
  | "recordsIStatus"
  | "recordsIIStatus"
>) {
  if (!batchCode) return null;

  const approvalStages = [
    accountsStatus,
    chartingStatus,
    surconStatus,
    recordsIStatus,
    recordsIIStatus,
  ];

  const approvedCount = approvalStages.filter((s) => s === "APPROVED").length;
  const queriedCount = approvalStages.filter((s) => s === "QUERIED").length;
  const totalStages = approvalStages.length;

  let badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
  let badgeText = `${approvedCount}/${totalStages} approved`;

  if (queriedCount > 0) {
    badgeColor = "bg-red-100 text-red-700 border-red-200";
    badgeText = `${queriedCount} queried`;
  } else if (approvedCount === totalStages) {
    badgeColor = "bg-green-100 text-green-700 border-green-200";
    badgeText = "All approved";
  }

  return (
    <Badge className={`px-2 py-1 text-xs ${badgeColor}`} title={batchCode}>
      <FileText className="w-3 h-3 mr-1" />
      {badgeText}
    </Badge>
  );
}
