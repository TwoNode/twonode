"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Download,
  Loader2,
  PlusCircle,
  DollarSign,
  TrendingUp,
  MapPin,
  FileCheck,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { surfboardApi } from "@/surfboard/apiClient";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

export default function QREarningsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await surfboardApi.qr.earningsOverview();
      if (res.success) {
        setData(res.data);
      } else {
        toast.error(res.error || "Failed to load earnings overview");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountNum > (data?.wallet?.availableBalance || 0)) {
      toast.error("Amount exceeds your available balance");
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      const res = await surfboardApi.qr.requestWithdrawal(amountNum);
      if (res.success) {
        toast.success("Withdrawal request submitted successfully!");
        setWithdrawalModalOpen(false);
        setWithdrawAmount("");
        fetchOverview();
      } else {
        toast.error(res.error || "Failed to submit withdrawal request");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to request withdrawal");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
          Loading your QR Earnings dashboard...
        </p>
      </div>
    );
  }

  const wallet = data?.wallet || {
    availableBalance: 0,
    totalEarned: 0,
    pendingWithdrawal: 0,
    totalWithdrawn: 0,
  };
  const bankDetails = data?.bankDetails;
  const transactions = data?.transactions || [];
  const withdrawals = data?.withdrawals || [];

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header & Withdrawal Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
              <Wallet className="w-6 h-6" />
            </div>
            QR Code Earnings
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
            Track passive income from client survey plan QR code scans and
            manage payouts.
          </p>
        </div>

        <Button
          onClick={() => setWithdrawalModalOpen(true)}
          className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-5 rounded-xl shadow-lg shadow-blue-500/20"
        >
          <ArrowUpRight className="w-5 h-5 mr-2" />
          Request Withdrawal
        </Button>
      </div>

      {/* KYC Warning Banner if Unverified */}
      {(!bankDetails || !bankDetails.isVerified) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl mt-0.5">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Bank Account Required for Payouts
              </h4>
              <p className="text-sm text-slate-600 dark:text-gray-300 mt-0.5">
                You are accumulating earnings from plan scans! Please set up
                your verified bank account under Settings to enable
                withdrawals.
              </p>
            </div>
          </div>
          <Link href="/surfboard/dashboard/settings">
            <Button
              variant="outline"
              className="border-amber-600 text-amber-900 hover:bg-amber-50 font-bold whitespace-nowrap"
            >
              Add Bank Account
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Available Balance */}
        <Card className="bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-xl border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-100 text-xs font-bold uppercase tracking-wider">
                Available Balance
              </span>
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black">
              ₦{wallet.availableBalance.toLocaleString()}
            </div>
            <p className="text-xs text-blue-200 mt-2">Ready for withdrawal</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="bg-white dark:bg-surface border-slate-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Total Revenue Earned
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₦{wallet.totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-2">
              Lifetime QR earnings
            </p>
          </CardContent>
        </Card>

        {/* Pending Withdrawal */}
        <Card className="bg-white dark:bg-surface border-slate-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Pending Withdrawal
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₦{wallet.pendingWithdrawal.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-2">
              Processing by admin
            </p>
          </CardContent>
        </Card>

        {/* Total Withdrawn */}
        <Card className="bg-white dark:bg-surface border-slate-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Total Withdrawn
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₦{wallet.totalWithdrawn.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-2">
              Paid to bank account
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History & Withdrawals Tabs */}
      <div className="space-y-6">
        {/* Recent Transactions Table */}
        <Card className="bg-white dark:bg-surface border-slate-200 shadow-md">
          <CardHeader className="border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              QR Service Scan Transactions
            </CardTitle>
            <CardDescription className="text-sm">
              List of client QR code scan purchases generating income for your survey plans.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-surface">
                <TableRow>
                  <TableHead className="font-bold">Plan Number</TableHead>
                  <TableHead className="font-bold">Service Type</TableHead>
                  <TableHead className="font-bold">Amount Earned</TableHead>
                  <TableHead className="font-bold">Total Paid</TableHead>
                  <TableHead className="font-bold">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500"
                    >
                      No QR service transactions yet. When clients scan your plan's QR code and purchase access, your earnings will appear here!
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-bold text-slate-900">
                        {tx.plan?.planNumber || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tx.serviceType === "LOCATION_AUTHENTICITY"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }
                        >
                          {tx.serviceType === "LOCATION_AUTHENTICITY" ? (
                            <MapPin className="w-3 h-3 mr-1" />
                          ) : (
                            <FileCheck className="w-3 h-3 mr-1" />
                          )}
                          {tx.serviceType === "LOCATION_AUTHENTICITY"
                            ? "Service 1: Location"
                            : "Service 2: CoD Access"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        +₦{tx.surveyorEarned.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        ₦{tx.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Withdrawal History Table */}
        <Card className="bg-white dark:bg-surface border-slate-200 shadow-md">
          <CardHeader className="border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Withdrawal History & Status
            </CardTitle>
            <CardDescription className="text-sm">
              Track pending and completed bank payout requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-surface">
                <TableRow>
                  <TableHead className="font-bold">Reference</TableHead>
                  <TableHead className="font-bold">Bank Details</TableHead>
                  <TableHead className="font-bold">Amount</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Requested Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500"
                    >
                      No withdrawal requests yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((wd: any) => (
                    <TableRow key={wd.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {wd.requestRef}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-semibold text-slate-900">
                          {wd.bankName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {wd.accountNumber} • {wd.accountName}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        ₦{wd.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            wd.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : wd.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border-amber-300"
                              : "bg-red-50 text-red-700 border-red-300"
                          }
                        >
                          {wd.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {format(new Date(wd.createdAt), "MMM d, yyyy • h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Request Modal */}
      <Dialog open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen}>
        <DialogContent className="sm:max-w-112.5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Request Earnings Withdrawal
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Funds will be sent directly to your registered bank account.
            </DialogDescription>
          </DialogHeader>

          {!bankDetails || !bankDetails.isVerified ? (
            <div className="py-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="text-sm text-slate-700 font-medium">
                Your bank account is not verified yet. Please set up your bank details under Settings first.
              </p>
              <Link href="/surfboard/dashboard/settings">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Go to Settings & Add Bank Details
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200 dark:border-white/10">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Payout Destination Bank
                </span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {bankDetails.bankName} • {bankDetails.accountNumber}
                </div>
                <div className="text-xs text-slate-600">
                  {bankDetails.accountName}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">
                  Withdrawal Amount (₦)
                </Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  min={100}
                  max={wallet.availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="mt-1 font-bold text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Available Balance: ₦{wallet.availableBalance.toLocaleString()}
                </p>
              </div>

              <Button
                type="submit"
                disabled={submittingWithdrawal || !withdrawAmount}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {submittingWithdrawal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  "Confirm & Submit Payout Request"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
