"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { SURFBOARD_COLORS, surfboardStatusBadgeStyle } from "@/surfboard/colors";

interface SurveyorRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  surconRegNumber: string | null;
  payerID: number | null;
  payerIDType: string | null;
  isKycValidated: boolean;
  createdAt: Date;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    isVerified: boolean;
    verifiedAt: Date | null;
  } | null;
}

export default function KycClient({
  initialSurveyors,
}: {
  initialSurveyors: SurveyorRow[];
}) {
  const [surveyors, setSurveyors] = useState(initialSurveyors);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingBankId, setLoadingBankId] = useState<string | null>(null);

  const filteredSurveyors = surveyors.filter((s) => {
    const searchStr = searchTerm.toLowerCase();
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
    return (
      fullName.includes(searchStr) ||
      s.email.toLowerCase().includes(searchStr) ||
      s.surconRegNumber?.toLowerCase().includes(searchStr)
    );
  });

  const handleToggleValidation = async (id: string, currentStatus: boolean) => {
    setLoadingId(id);
    const newStatus = !currentStatus;
    
    const res = await surfboardApi.settings.toggleUserKyc(id, newStatus);
    if (res.success) {
      setSurveyors((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isKycValidated: newStatus } : s
        )
      );
      toast.success(`User KYC ${newStatus ? "Validated" : "Revoked"} successfully.`);
    } else {
      toast.error(res.error || "Failed to update KYC status.");
    }
    setLoadingId(null);
  };

  const handleToggleBankVerification = async (id: string, currentStatus: boolean) => {
    setLoadingBankId(id);
    const newStatus = !currentStatus;

    const res = await surfboardApi.admin.kyc.toggleVerification(id, newStatus);
    if (res.success) {
      setSurveyors((prev) =>
        prev.map((s) =>
          s.id === id && s.bankDetails
            ? {
                ...s,
                bankDetails: {
                  ...s.bankDetails,
                  isVerified: newStatus,
                  verifiedAt: newStatus ? new Date() : null,
                },
              }
            : s
        )
      );
      toast.success(`Bank account ${newStatus ? "verified" : "unverified"} successfully.`);
    } else {
      toast.error(res.error || "Failed to update bank verification status.");
    }
    setLoadingBankId(null);
  };

  return (
    <Card className="bg-white border-gray-200 shadow-xl">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or SURCON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 w-full h-11"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle
                className="h-4 w-4"
                style={{ color: SURFBOARD_COLORS.success.main }}
              />{" "}
              Validated
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4"
                style={{ color: SURFBOARD_COLORS.warning.main }}
              />{" "}
              Pending
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead
              className="text-gray-700"
              style={{ backgroundColor: SURFBOARD_COLORS.surface.main }}
            >
              <tr>
                <th className="px-4 py-3 font-medium">Surveyor</th>
                <th className="px-4 py-3 font-medium">SURCON Reg No</th>
                <th className="px-4 py-3 font-medium">Payer Details</th>
                <th className="px-4 py-3 font-medium">Bank Account</th>
                <th className="px-4 py-3 font-medium">Joined Date</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSurveyors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No surveyors found.
                  </td>
                </tr>
              ) : (
                filteredSurveyors.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-gray-500 text-xs">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.surconRegNumber || (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.payerID ? (
                        <div className="flex flex-col gap-1">
                          <span>{s.payerID}</span>
                          <Badge variant="outline" className="w-fit text-xs border-gray-300 text-gray-600">
                            {s.payerIDType || "Unknown Type"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.bankDetails ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-gray-900">
                              {s.bankDetails.accountName}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {s.bankDetails.bankName} •{" "}
                              {s.bankDetails.accountNumber}
                            </span>
                          </div>
                          <Switch
                            checked={s.bankDetails.isVerified}
                            disabled={loadingBankId === s.id}
                            onCheckedChange={() =>
                              handleToggleBankVerification(
                                s.id,
                                s.bankDetails!.isVerified
                              )
                            }
                            className="data-[state=checked]:bg-[#43AA8B]"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(s.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.isKycValidated ? (
                        <Badge style={surfboardStatusBadgeStyle("success")}>
                          Validated
                        </Badge>
                      ) : (
                        <Badge style={surfboardStatusBadgeStyle("warning")}>
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-gray-500">
                          {s.isKycValidated ? "Revoke" : "Approve"}
                        </span>
                        <Switch
                          checked={s.isKycValidated}
                          disabled={loadingId === s.id}
                          onCheckedChange={() =>
                            handleToggleValidation(s.id, s.isKycValidated)
                          }
                          className="data-[state=checked]:bg-[#43AA8B]"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
