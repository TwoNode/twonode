"use client";

import { useEffect, useState } from "react";
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
  Search,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";

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

interface BatchStats {
  count: number;
  totalPlans: number;
  totalAmount: number;
}

const TAB_STATUS: Record<string, string> = {
  paid: "LASG_PAID",
  approved: "ACCOUNTS_APPROVED",
};

interface BatchFilters {
  status: string;
}

export default function BatchManagementPage() {
  const [activeTab, setActiveTabState] = useState<string>("paid");
  const [stats, setStats] = useState<BatchStats | null>(null);

  const {
    items: batches,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
    reload,
  } = useServerList<Batch, BatchFilters>(
    async ({ page, pageSize, search, filters }) =>
      surfboardApi.cod.batches.listPaginated({
        page,
        pageSize,
        search: search || undefined,
        status: filters.status,
      }),
    { initialFilters: { status: TAB_STATUS.paid } }
  );

  const loadStats = async (status: string) => {
    const res = await surfboardApi.cod.batches.statsByStatus(status);
    if (res.success && res.data) setStats(res.data);
  };

  useEffect(() => {
    loadStats(TAB_STATUS[activeTab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setFilters({ status: TAB_STATUS[tab] ?? TAB_STATUS.paid });
  };

  const handleRefresh = async () => {
    await reload();
    await loadStats(TAB_STATUS[activeTab]);
    toast.success("Batches refreshed");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return (
          <Badge className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting Payment
          </Badge>
        );
      case "LASG_PAID":
        return (
          <Badge className="bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid via Remita
          </Badge>
        );
      case "ACCOUNTS_APPROVED":
        return (
          <Badge className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accounts Approved
          </Badge>
        );
      case "ACCOUNTS_DISAPPROVED":
        return (
          <Badge className="bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300">
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
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(batch.totalAmount)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total (inc. {formatCurrency(batch.systemCharges)} system charges)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Batch Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Plans in Batch
            </p>
            <p className="text-lg font-semibold">{batch.planCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Base Fees
            </p>
            <p className="text-sm font-medium">
              {formatCurrency(batch.totalFees)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              System Charges
            </p>
            <p className="text-sm font-medium">
              {formatCurrency(batch.systemCharges)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Remita RRR
            </p>
            <p className="text-sm font-mono">{batch.userPaymentRef || "N/A"}</p>
          </div>
        </div>

        {/* Submitter Info */}
        {batch.submitter && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {batch.submitter.firstName} {batch.submitter.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {batch.submitter.email}
              </p>
            </div>
          </div>
        )}

        {/* Payment Info */}
        {batch.userPaymentDate && (
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-500/10 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Payment Verified via Remita
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Batch Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View Certificate of Deposit batches with verified Remita payments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="paid">MDA Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-green-100 dark:bg-green-500/15 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.count ?? 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeTab === "paid"
                      ? "Ready for MDA Review"
                      : "Approved Batches"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/15 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalPlans ?? 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Plans
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 bg-green-100 dark:bg-green-500/15 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats?.totalAmount ?? 0)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Amount
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by batch code or submitter…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : batches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {activeTab === "paid"
                    ? "No batches pending MDA review"
                    : "No approved batches yet"}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  {search
                    ? "Try adjusting your search"
                    : "Batches with verified Remita payments will appear here"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {batches.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages} • {total} batches
                  </p>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
