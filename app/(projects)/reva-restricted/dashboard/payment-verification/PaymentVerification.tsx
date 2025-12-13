"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { verifyPaystackTransaction } from "../../../reva/actions/paystackActions";
import { getAllRequestsWithUserByAdmin } from "../../actions/adminDbActions";
import {
  updatePropertyTransactionStatus,
  updateOneTimeTransactionStatus,
} from "../../../reva/actions/revaActions";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
} from "@/utils/notify";

interface Request {
  id: string;
  reference: string;
  title?: string;
  address: string;
  totalCost: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isLive: boolean;
  type?: "authenticated" | "oneTime";
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  email?: string;
  requester?: string;
}

interface VerificationResult {
  reference: string;
  originalStatus: string;
  newStatus: string;
  success: boolean;
  message: string;
  isLive: boolean;
}

export function PaymentVerification() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationResults, setVerificationResults] = useState<
    VerificationResult[]
  >([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllRequestsWithUserByAdmin({
        includeOneTimeRequests: true,
      });

      if (response.success) {
        const allRequests: Request[] = [
          ...(response.data || []).map((req: any) => ({
            ...req,
            type: "authenticated",
          })),
          ...(response.oneTimeRequests || []).map((req: any) => ({
            ...req,
            type: "oneTime",
          })),
        ];
        setRequests(allRequests);
      } else {
        notifyError("Failed to fetch requests");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      notifyError("Error fetching requests");
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (req.title &&
            req.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (req.user?.email &&
            req.user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (req.email &&
            req.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.paymentStatus === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const verifyPayment = async (
    request: Request
  ): Promise<VerificationResult> => {
    try {
      const verificationResponse = await verifyPaystackTransaction(
        request.reference,
        request.isLive
      );

      const originalStatus = request.paymentStatus;
      let newStatus = originalStatus;
      let success = false;
      let message = "";

      if (verificationResponse && verificationResponse.status) {
        const paystackData = verificationResponse.data;

        if (paystackData.status === "success") {
          newStatus = "Paid";
          success = true;
          message = "Payment verified as successful";

          // Update database
          if (request.type === "authenticated") {
            await updatePropertyTransactionStatus(
              request.reference,
              "Processing",
              "Paid",
              "Payment verified via admin verification",
              null
            );
          } else {
            await updateOneTimeTransactionStatus(
              request.reference,
              "Processing",
              "Paid",
              "Payment verified via admin verification",
              null
            );
          }
        } else {
          newStatus = "Unpaid";
          success = true;
          message = `Payment status: ${paystackData.status}`;

          // Update database
          if (request.type === "authenticated") {
            await updatePropertyTransactionStatus(
              request.reference,
              "Processing",
              "Unpaid",
              `Payment verification failed: ${paystackData.status}`,
              paystackData.gateway_response || "Payment verification failed"
            );
          } else {
            await updateOneTimeTransactionStatus(
              request.reference,
              "Processing",
              "Unpaid",
              `Payment verification failed: ${paystackData.status}`,
              paystackData.gateway_response || "Payment verification failed"
            );
          }
        }
      } else {
        newStatus = "Unpaid";
        success = false;
        message = "Failed to verify payment with Paystack";
      }

      return {
        reference: request.reference,
        originalStatus,
        newStatus,
        success,
        message,
        isLive: request.isLive,
      };
    } catch (error) {
      console.error(`Error verifying payment for ${request.reference}:`, error);
      return {
        reference: request.reference,
        originalStatus: request.paymentStatus,
        newStatus: request.paymentStatus,
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        isLive: request.isLive,
      };
    }
  };

  const verifyAllPayments = async () => {
    try {
      setVerifying(true);
      setVerificationResults([]);

      const results: VerificationResult[] = [];
      const unpaidRequests = filteredRequests.filter(
        (req) => req.paymentStatus !== "Paid"
      );

      notifyInfo(
        `Starting verification of ${unpaidRequests.length} unpaid requests...`
      );

      for (const request of unpaidRequests) {
        const result = await verifyPayment(request);
        results.push(result);

        // Update the request in the local state
        setRequests((prev) =>
          prev.map((req) =>
            req.reference === request.reference
              ? { ...req, paymentStatus: result.newStatus }
              : req
          )
        );
      }

      setVerificationResults(results);
      setShowResults(true);

      const successfulVerifications = results.filter((r) => r.success).length;
      const statusChanges = results.filter(
        (r) => r.originalStatus !== r.newStatus
      ).length;

      notifySuccess(
        `Verification completed! ${successfulVerifications} successful, ${statusChanges} status changes.`
      );

      // Refresh the requests list
      await fetchRequests();
    } catch (error) {
      console.error("Error during bulk verification:", error);
      notifyError("Error during bulk verification");
    } finally {
      setVerifying(false);
    }
  };

  const verifySinglePayment = async (request: Request) => {
    try {
      setVerifying(true);

      const result = await verifyPayment(request);

      // Update the request in the local state
      setRequests((prev) =>
        prev.map((req) =>
          req.reference === request.reference
            ? { ...req, paymentStatus: result.newStatus }
            : req
        )
      );

      if (result.success) {
        notifySuccess(
          `Payment verified for ${request.reference}: ${result.message}`
        );
      } else {
        notifyError(
          `Verification failed for ${request.reference}: ${result.message}`
        );
      }

      // Refresh the requests list
      await fetchRequests();
    } catch (error) {
      console.error("Error verifying single payment:", error);
      notifyError("Error verifying payment");
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Paid: "bg-green-100 text-green-800",
      Unpaid: "bg-red-100 text-red-800",
      Processing: "bg-yellow-100 text-yellow-800",
    };

    return (
      <Badge
        className={
          variants[status as keyof typeof variants] ||
          "bg-gray-100 text-gray-800"
        }
      >
        {status}
      </Badge>
    );
  };

  const getEnvironmentBadge = (isLive: boolean) => {
    return (
      <Badge
        className={
          isLive ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
        }
      >
        {isLive ? "Live" : "Test"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Verification
          </h1>
          <p className="text-gray-600 mt-1">
            Verify payment status with Paystack for all requests
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={verifyAllPayments}
            disabled={
              verifying ||
              filteredRequests.filter((req) => req.paymentStatus !== "Paid")
                .length === 0
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </>
            ) : (
              "Verify All Unpaid"
            )}
          </Button>

          <Button
            onClick={() => setShowResults(!showResults)}
            variant="outline"
            disabled={verificationResults.length === 0}
          >
            {showResults ? "Hide Results" : "Show Results"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by reference, address, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Payment Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Results */}
      {showResults && verificationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verification Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {verificationResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? result.originalStatus !== result.newStatus
                        ? "bg-green-50 border-green-200"
                        : "bg-blue-50 border-blue-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{result.reference}</p>
                      <p className="text-sm text-gray-600">{result.message}</p>
                      <p className="text-xs text-gray-500">
                        {result.originalStatus} → {result.newStatus}
                        {result.isLive && " (Live)"}
                      </p>
                    </div>
                    <Badge
                      className={
                        result.success
                          ? result.originalStatus !== result.newStatus
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Requests ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">
                      {request.reference}
                    </TableCell>
                    <TableCell>
                      {request.user ? (
                        <div>
                          <p className="font-medium">
                            {request.user.firstName} {request.user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.user.email}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{request.requester}</p>
                          <p className="text-sm text-gray-500">
                            {request.email}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.address}
                    </TableCell>
                    <TableCell>
                      ₦{request.totalCost?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.paymentStatus)}
                    </TableCell>
                    <TableCell>{getEnvironmentBadge(request.isLive)}</TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              verifying || request.paymentStatus === "Paid"
                            }
                          >
                            Verify
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Verify Payment for {request.reference}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will verify the payment status with Paystack
                              and update the database accordingly. Are you sure
                              you want to proceed?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => verifySinglePayment(request)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Verify Payment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No requests found matching the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
