"use client";

import React, { useMemo, useState } from "react";
import { Search, CheckCircle, AlertCircle, BadgeCheck, Landmark } from "lucide-react";
import { formatInAdminTimezone } from "@/lib/adminTimezone";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { SURFBOARD_COLORS, surfboardStatusBadgeStyle } from "@/surfboard/colors";
import { KYC_FILTERS, countByKycFilter, matchesKycFilter, type KycFilter } from "@/surfboard/utils/kycFilter";

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
  const [filter, setFilter] = useState<KycFilter>("all");
  // The bank account an admin is about to verify or revoke, held while the confirmation is open.
  const [bankTarget, setBankTarget] = useState<{ surveyor: SurveyorRow; verify: boolean } | null>(null);

  const counts = useMemo(() => countByKycFilter(surveyors), [surveyors]);

  const filteredSurveyors = surveyors.filter((s) => {
    if (!matchesKycFilter(s, filter)) return false;
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
    <Card className="bg-white dark:bg-surface border-gray-200 dark:border-white/10 shadow-xl">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search by name, email, or SURCON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-surface border-gray-300 dark:border-white/15 text-gray-900 dark:text-white w-full h-11"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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

        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter surveyors">
          {KYC_FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(value)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? "border-transparent bg-[#000b3d] text-white dark:bg-white dark:text-[#000b3d]"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    active ? "bg-white/20 dark:bg-[#000b3d]/15" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                  }`}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-md border border-gray-200 dark:border-white/10 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-300">
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
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {filter === "all" && !searchTerm
                      ? "No surveyors found."
                      : "No surveyors match this filter. Try another filter or clear the search."}
                  </td>
                </tr>
              ) : (
                filteredSurveyors.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {s.surconRegNumber || (
                        <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {s.payerID ? (
                        <div className="flex flex-col gap-1">
                          <span>{s.payerID}</span>
                          <Badge variant="outline" className="w-fit text-xs border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-400">
                            {s.payerIDType || "Unknown Type"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {s.bankDetails ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">
                              {s.bankDetails.accountName}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                              {s.bankDetails.bankName} •{" "}
                              {s.bankDetails.accountNumber}
                            </span>
                          </div>
                          {s.bankDetails.isVerified ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge style={surfboardStatusBadgeStyle("success")} className="gap-1">
                                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                                Verified
                                {s.bankDetails.verifiedAt && (
                                  <span className="font-normal">
                                    · {formatInAdminTimezone(s.bankDetails.verifiedAt)}
                                  </span>
                                )}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-gray-600 hover:text-red-600 dark:text-gray-400"
                                disabled={loadingBankId === s.id}
                                onClick={() => setBankTarget({ surveyor: s, verify: false })}
                              >
                                Revoke
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge style={surfboardStatusBadgeStyle("warning")}>Awaiting approval</Badge>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                disabled={loadingBankId === s.id}
                                onClick={() => setBankTarget({ surveyor: s, verify: true })}
                              >
                                <Landmark className="h-3.5 w-3.5" aria-hidden />
                                Verify account
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatInAdminTimezone(s.createdAt)}
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
                        <span className="text-xs text-gray-500 dark:text-gray-400">
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

        <AlertDialog open={bankTarget !== null} onOpenChange={(open) => !open && setBankTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bankTarget?.verify ? "Verify this bank account?" : "Revoke bank verification?"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  {bankTarget?.surveyor.bankDetails && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-gray-200 p-3 dark:border-white/10">
                      <dt className="text-gray-500">Surveyor</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {bankTarget.surveyor.firstName} {bankTarget.surveyor.lastName}
                      </dd>
                      <dt className="text-gray-500">Account name</dt>
                      <dd className="text-gray-900 dark:text-white">{bankTarget.surveyor.bankDetails.accountName}</dd>
                      <dt className="text-gray-500">Account</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {bankTarget.surveyor.bankDetails.bankName} • {bankTarget.surveyor.bankDetails.accountNumber}
                      </dd>
                    </dl>
                  )}
                  <p>
                    {bankTarget?.verify
                      ? "Check that the account name matches the surveyor before you continue. Once verified, this surveyor can withdraw their QR earnings to this account."
                      : "The surveyor will not be able to withdraw earnings until the account is verified again."}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (bankTarget) void handleToggleBankVerification(bankTarget.surveyor.id, !bankTarget.verify);
                  setBankTarget(null);
                }}
              >
                {bankTarget?.verify ? "Verify account" : "Revoke"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
