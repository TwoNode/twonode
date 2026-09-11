"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";

export const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa (UBA)" },
  { code: "50211", name: "Kuda Microfinance Bank" },
  { code: "999992", name: "OPay Digital Services" },
  { code: "999991", name: "PalmPay" },
  { code: "50515", name: "Moniepoint Microfinance Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "070", name: "Fidelity Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "215", name: "Unity Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "082", name: "Keystone Bank" },
  { code: "301", name: "Jaiz Bank" },
];

interface SurveyorBankSettingsProps {
  initialBankDetails?: any;
}

export function SurveyorBankSettings({
  initialBankDetails,
}: SurveyorBankSettingsProps) {
  const [bankCode, setBankCode] = useState(
    initialBankDetails?.bankCode || "058"
  );
  const [accountNumber, setAccountNumber] = useState(
    initialBankDetails?.accountNumber || ""
  );
  const [bankDetails, setBankDetails] = useState<any>(
    initialBankDetails || null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialBankDetails) {
      setBankDetails(initialBankDetails);
      setBankCode(initialBankDetails.bankCode);
      setAccountNumber(initialBankDetails.accountNumber);
    }
  }, [initialBankDetails]);

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit NUBAN account number");
      return;
    }

    const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    if (!selectedBank) {
      toast.error("Please select a valid bank");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Resolving bank account with Paystack...");

    try {
      const res = await surfboardApi.qr.saveBankDetails({
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber,
      });

      if (res.success) {
        toast.success(`Verified: ${res.data.accountName}`, { id: toastId });
        setBankDetails(res.data);
      } else {
        toast.error(res.error || "Bank account verification failed", {
          id: toastId,
        });
      }
    } catch (err: any) {
      console.error("Save Bank Details Error:", err);
      toast.error(err.message || "Failed to save bank details", {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="border-b border-gray-100 dark:border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-600" />
              Bank Account & Payout KYC
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1">
              Add your bank account details to receive automated QR Code
              Earnings payouts.
            </CardDescription>
          </div>
          {bankDetails?.isVerified ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified for Payouts
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Unverified / Missing
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSaveBankDetails} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Select Bank */}
            <div className="space-y-2">
              <Label htmlFor="bankCode" className="text-sm font-semibold">
                Bank Name <span className="text-red-500">*</span>
              </Label>
              <select
                id="bankCode"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                disabled={loading}
                className="w-full p-2.5 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-sm font-semibold">
                Account Number (10 Digits) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountNumber"
                type="text"
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/\D/g, ""))
                }
                disabled={loading}
                className="border-gray-300 dark:border-white/15 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tracking-wider font-mono text-base"
              />
            </div>
          </div>

          {/* Account Name Display if Verified */}
          {bankDetails?.accountName && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Verified Account Name
                </span>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {bankDetails.accountName}
                </h4>
              </div>
              <Building2 className="w-8 h-8 text-blue-500/40" />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || accountNumber.length !== 10}
              className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md font-semibold px-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Account...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Verify & Save Bank Details
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
