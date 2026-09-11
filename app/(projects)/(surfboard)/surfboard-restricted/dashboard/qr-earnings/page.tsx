"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  DollarSign,
  Loader2,
  MapPin,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/useConfirm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { surfboardApi } from "@/surfboard/apiClient";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminQREarningsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, queueRes] = await Promise.all([
        surfboardApi.admin.qr.stats(),
        surfboardApi.admin.qr.pendingWithdrawals(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (queueRes.success) setPendingRequests(queueRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin QR earnings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprovePayout = async (requestId: string) => {
    if (
      !(await confirm({
        title: "Approve payout?",
        description:
          "Are you sure you want to approve and execute this payout via Paystack?",
        confirmLabel: "Approve & pay",
      }))
    )
      return;

    setProcessingId(requestId);
    const toastId = toast.loading("Processing Paystack Automated Transfer...");

    try {
      const res = await surfboardApi.admin.qr.processWithdrawal(
        requestId,
        "APPROVE_PAYOUT",
      );
      if (res.success) {
        toast.success(res.data.message || "Payout approved and sent!", {
          id: toastId,
        });
        fetchData();
      } else {
        toast.error(res.error || "Failed to process payout", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Payout processing error", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRejectId) return;

    setProcessingId(selectedRejectId);
    const toastId = toast.loading("Rejecting withdrawal request...");

    try {
      const res = await surfboardApi.admin.qr.processWithdrawal(
        selectedRejectId,
        "REJECT",
        rejectReason,
      );

      if (res.success) {
        toast.success("Withdrawal request rejected and refunded", {
          id: toastId,
        });
        setRejectModalOpen(false);
        setRejectReason("");
        setSelectedRejectId(null);
        fetchData();
      } else {
        toast.error(res.error || "Failed to reject withdrawal", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Error rejecting withdrawal", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
          Loading Admin QR Earnings Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background p-4 sm:p-6 lg:p-8 space-y-8">
      {ConfirmDialog}
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md">
            <DollarSign className="w-6 h-6" />
          </div>
          QR Code Revenue & Payout Queue
        </h1>
        <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
          Platform-wide revenue stats, top surveyor leaderboard, and Paystack
          automated payout management.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-linear-to-br from-indigo-900 to-slate-900 text-white shadow-xl border-none">
          <CardContent className="p-6">
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
              Total Platform Revenue
            </span>
            <div className="text-3xl font-black mt-2">
              ₦{(stats?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-indigo-300 mt-2">
              {stats?.totalTransactions || 0} scan purchases
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-surface border-slate-200 dark:border-white/10 shadow-md">
          <CardContent className="p-6">
            <span className="text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
              Surveyor Verification Fees
            </span>
            <div className="text-3xl font-black text-emerald-600 mt-2">
              ₦{(stats?.totalVerificationFees || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">Credited to surveyors</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-surface border-slate-200 dark:border-white/10 shadow-md">
          <CardContent className="p-6">
            <span className="text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
              Platform Service Fees
            </span>
            <div className="text-3xl font-black text-blue-600 mt-2">
              ₦{(stats?.totalServiceFees || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
              Platform retained income
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-surface border-slate-200 dark:border-white/10 shadow-md">
          <CardContent className="p-6">
            <span className="text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
              Pending Payout Queue
            </span>
            <div className="text-3xl font-black text-amber-600 mt-2">
              ₦{(stats?.pendingWithdrawalsAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 font-semibold mt-2">
              {stats?.pendingWithdrawalsCount || 0} requests awaiting payout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payout Queue Section */}
      <Card className="bg-white dark:bg-surface border-slate-200 dark:border-white/10 shadow-md">
        <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Payout Requests Queue
            </CardTitle>
            <CardDescription className="text-sm">
              Surveyors requesting earnings withdrawals. Click "Approve & Pay
              Out" to trigger Paystack Transfer.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 font-bold px-3 py-1">
            {pendingRequests.length} Pending
          </Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-surface">
              <TableRow>
                <TableHead className="font-bold">Ref</TableHead>
                <TableHead className="font-bold">Surveyor</TableHead>
                <TableHead className="font-bold">Bank Details</TableHead>
                <TableHead className="font-bold">Amount</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-slate-500 dark:text-gray-400"
                  >
                    No pending withdrawal requests in the queue.
                  </TableCell>
                </TableRow>
              ) : (
                pendingRequests.map((req: any) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {req.requestRef}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {req.user?.firstName} {req.user?.lastName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-400">
                        {req.user?.companyName || req.user?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {req.bankName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                        {req.accountNumber} • {req.accountName}
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-slate-900 dark:text-white text-base">
                      ₦{req.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-gray-400">
                      {format(new Date(req.createdAt), "MMM d, yyyy • h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprovePayout(req.id)}
                          disabled={processingId === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Approve & Pay Out
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRejectId(req.id);
                            setRejectModalOpen(true);
                          }}
                          disabled={processingId === req.id}
                          className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Leaderboard Section */}
      <Card className="bg-white dark:bg-surface border-slate-200 dark:border-white/10 shadow-md">
        <CardHeader className="border-b border-slate-100 p-6">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Earning Surveyors Leaderboard
          </CardTitle>
          <CardDescription className="text-sm">
            Surveyors generating the highest volume of QR Code Service earnings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-surface">
              <TableRow>
                <TableHead className="font-bold">Rank</TableHead>
                <TableHead className="font-bold">Surveyor Name</TableHead>
                <TableHead className="font-bold">Company</TableHead>
                <TableHead className="font-bold">Scan Purchases</TableHead>
                <TableHead className="font-bold">Total Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats?.leaderboard || []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-slate-500 dark:text-gray-400"
                  >
                    No earnings activity recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                stats.leaderboard.map((item: any, idx: number) => (
                  <TableRow key={item.surveyorId}>
                    <TableCell className="font-black text-slate-700 dark:text-gray-300 text-sm">
                      #{idx + 1}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300 text-sm">
                      {item.company}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800 dark:text-gray-200">
                      {item.transactionsCount} scans
                    </TableCell>
                    <TableCell className="font-black text-emerald-600 text-base">
                      ₦{item.totalEarned.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Reject Withdrawal Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-gray-400">
              Provide a reason. The requested funds will be refunded back to the
              surveyor's available balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRejectPayout} className="space-y-4 pt-2">
            <Input
              placeholder="Reason for rejection (e.g. Invalid bank details)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={!rejectReason || processingId !== null}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Confirm Rejection & Refund Balance
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
