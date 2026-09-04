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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

interface Batch {
  id: string;
  batchCode: string;
  submittedBy: string;
  planCount: number;
  totalFees: number;
  systemCharges: number;
  totalAmount: number;
  paymentStatus: string;
  userPaymentRef: string | null;
  userPaymentDate: Date | null;
  lasgReceiptUrl: string | null;
  createdAt: Date;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function BatchManagementPage() {
  const [paidBatches, setPaidBatches] = useState<Batch[]>([]);
  const [approvedBatches, setApprovedBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("paid");

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      // Fetch batches with LASG_PAID (ready for MDA review) and ACCOUNTS_APPROVED
      const [paidResult, approvedResult] = await Promise.all([
        surfboardApi.cod.batches.list("LASG_PAID"),
        surfboardApi.cod.batches.list("ACCOUNTS_APPROVED"),
      ]);

      if (paidResult.success) {
        setPaidBatches(paidResult.data || []);
      } else {
        toast.error(paidResult.error || "Failed to fetch paid batches");
      }

      if (approvedResult.success) {
        setApprovedBatches(approvedResult.data || []);
      } else {
        toast.error(
          approvedResult.error || "Failed to fetch approved batches"
        );
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("An error occurred while fetching batches");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBatches();
    setRefreshing(false);
    toast.success("Batches refreshed");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting Payment
          </Badge>
        );
      case "LASG_PAID":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid via Remita
          </Badge>
        );
      case "ACCOUNTS_APPROVED":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accounts Approved
          </Badge>
        );
      case "ACCOUNTS_DISAPPROVED":
        return (
          <Badge className="bg-red-100 text-red-700">
            <Clock className="w-3 h-3 mr-1" />
            Accounts Disapproved
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading batches...</p>
        </div>
      </div>
    );
  }

  const BatchCard = ({ batch }: { batch: Batch }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{batch.batchCode}</CardTitle>
              {getStatusBadge(batch.paymentStatus)}
            </div>
            <CardDescription className="mt-1">
              Submitted on {new Date(batch.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(batch.totalAmount)}
            </p>
            <p className="text-xs text-gray-500">
              Total (inc. {formatCurrency(batch.systemCharges)} system charges)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Batch Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Plans in Batch</p>
            <p className="text-lg font-semibold">{batch.planCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Base Fees</p>
            <p className="text-sm font-medium">
              {formatCurrency(batch.totalFees)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">System Charges</p>
            <p className="text-sm font-medium">
              {formatCurrency(batch.systemCharges)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Remita RRR</p>
            <p className="text-sm font-mono">
              {batch.userPaymentRef || "N/A"}
            </p>
          </div>
        </div>

        {/* Submitter Info */}
        {batch.submitter && (
          <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">
                {batch.submitter.firstName} {batch.submitter.lastName}
              </p>
              <p className="text-xs text-gray-500">{batch.submitter.email}</p>
            </div>
          </div>
        )}

        {/* Payment Info */}
        {batch.userPaymentDate && (
          <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Payment Verified via Remita
              </p>
              <p className="text-xs text-green-600">
                {new Date(batch.userPaymentDate).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-gray-600 mt-1">
            View Certificate of Deposit batches with verified Remita payments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="paid">
            MDA Review ({paidBatches.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedBatches.length})
          </TabsTrigger>
        </TabsList>

        {/* Paid Batches Tab (Ready for MDA Review) */}
        <TabsContent value="paid" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{paidBatches.length}</p>
                  <p className="text-sm text-gray-500">Ready for MDA Review</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {paidBatches.reduce((sum, b) => sum + b.planCount, 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Plans</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      paidBatches.reduce((sum, b) => sum + b.totalAmount, 0)
                    )}
                  </p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {paidBatches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">
                  No batches pending MDA review
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Batches with verified Remita payments will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {paidBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Batches Tab */}
        <TabsContent value="approved" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedBatches.length}</p>
                  <p className="text-sm text-gray-500">Approved Batches</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {approvedBatches.reduce((sum, b) => sum + b.planCount, 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Plans</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      approvedBatches.reduce((sum, b) => sum + b.totalAmount, 0)
                    )}
                  </p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {approvedBatches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">
                  No approved batches yet
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Batches approved by MDA Accounts will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvedBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
