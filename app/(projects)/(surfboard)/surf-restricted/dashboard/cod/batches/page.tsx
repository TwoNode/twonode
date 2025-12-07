"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  FileText,
  Loader2,
  Upload,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import { uploadLASGReceipt } from "../../../../actions/codActions";
import { uploadSurfboardFileWithAuth } from "../../../../actions/awsActions";

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
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      // Fetch batches that have user payment but no LASG receipt
      const response = await fetch("/api/surfboard/batches?status=USER_PAID");
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      } else {
        toast.error("Failed to fetch batches");
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("An error occurred while fetching batches");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setSelectedFile(null);
    setShowUploadDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF or image file");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadReceipt = async () => {
    if (!selectedBatch || !selectedFile) return;

    try {
      setUploading(true);

      // Upload file to S3 - "redcopy" type for LASG receipt
      const uploadResult = await uploadSurfboardFileWithAuth(
        selectedFile,
        "redcopy",
        selectedBatch.batchCode
      );

      if (!uploadResult || !uploadResult.url || !uploadResult.key) {
        throw new Error("Failed to upload file");
      }

      // Update batch with receipt URL
      const result = await uploadLASGReceipt(
        selectedBatch.id,
        uploadResult.url,
        uploadResult.key
      );

      if (result.success) {
        toast.success(
          `LASG receipt uploaded for batch ${selectedBatch.batchCode}`
        );
        setShowUploadDialog(false);
        fetchBatches(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to update batch");
      }
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("An error occurred while uploading the receipt");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_USER_PAYMENT":
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting User Payment
          </Badge>
        );
      case "USER_PAID":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <DollarSign className="w-3 h-3 mr-1" />
            User Paid - Awaiting LASG
          </Badge>
        );
      case "LASG_PAID":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            LASG Paid
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
        <p className="text-gray-600 mt-1">
          Manage Certificate of Deposit batches and upload LASG payment receipts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{batches.length}</p>
              <p className="text-sm text-gray-500">Awaiting LASG Receipt</p>
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
                {batches.reduce((sum, b) => sum + b.planCount, 0)}
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
                  batches.reduce((sum, b) => sum + b.totalAmount, 0)
                )}
              </p>
              <p className="text-sm text-gray-500">Total Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              No batches awaiting LASG receipt
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Batches with user payment complete will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => (
            <Card key={batch.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">
                        {batch.batchCode}
                      </CardTitle>
                      {getStatusBadge(batch.paymentStatus)}
                    </div>
                    <CardDescription className="mt-1">
                      Submitted on{" "}
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(batch.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total (inc. {formatCurrency(batch.systemCharges)} system
                      charges)
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
                    <p className="text-xs text-gray-500">User Payment Ref</p>
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
                      <p className="text-xs text-gray-500">
                        {batch.submitter.email}
                      </p>
                    </div>
                  </div>
                )}

                {/* User Payment Info */}
                {batch.userPaymentDate && (
                  <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        User Payment Received
                      </p>
                      <p className="text-xs text-green-600">
                        {new Date(batch.userPaymentDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => handleUploadClick(batch)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload LASG Receipt
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload LASG Payment Receipt</DialogTitle>
            <DialogDescription>
              Upload the receipt from Lagos State Government for batch{" "}
              {selectedBatch?.batchCode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                Batch Amount:{" "}
                {selectedBatch && formatCurrency(selectedBatch.totalAmount)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Please ensure the LASG receipt amount matches the batch total
              </p>
            </div>

            {/* File Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-500">Click to change file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Click to select receipt file
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPG, PNG, or WebP (max 10MB)
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800">
              <p className="font-medium">After uploading:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Batch status will change to LASG_PAID</li>
                <li>All MDA admins will be notified</li>
                <li>Accounts admin can verify the receipt</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadReceipt}
              disabled={uploading || !selectedFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
