import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  CheckCircle,
  Download,
  FileText,
  MapPin,
  User,
  Phone,
  Mail,
  ArrowRight,
  Home,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SecureDownloadDialog } from "@/reva/components/SecureDownloadDialog";

// Format currency helper
const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return String(amount);
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num) ? String(amount) : `₦${num.toLocaleString()}`;
};

// Format date helper
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return String(dateString);
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? String(dateString) : format(date, "PPP");
  } catch (error) {
    return String(dateString);
  }
};

const VerifyPaymentContent = ({ formData }: { formData: any }) => {
  const isProcessing = formData.status === "Processing";
  const isCompleted = formData.status === "Completed";
  const isPaid = formData.paymentStatus === "Paid";

  const isReportReady =
    formData?.report &&
    typeof formData.report === "object" &&
    "isApproved" in formData.report &&
    formData.report?.isApproved === true;

  // Format the total cost with currency
  const totalCost = formatCurrency(formData.totalCost);

  // Format dates
  const createdAt = formatDate(formData.createdAt);
  const updatedAt = formatDate(formData.updatedAt);

  // Get status badge variant
  const getStatusVariant = () => {
    if (isCompleted) return "default";
    if (isProcessing) return "secondary";
    return "outline";
  };

  // Get payment status variant
  const getPaymentStatusVariant = () => {
    if (isPaid) return "default";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-background dark:to-background">
      {/* Header */}
      <header className="bg-white dark:bg-surface shadow-sm border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="shrink-0">
                <Image
                  src="/reva/revaLogo.png"
                  alt="REVA Logo"
                  width={120}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
              </div>
              <div className="hidden md:block h-8 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Property Verification
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Secure and reliable property verification services
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="hidden md:flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
            >
              <Home className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <AlertTitle className="text-green-800 font-semibold">
                  {isPaid ? "Payment Successful!" : "Payment Pending"}
                </AlertTitle>
                <AlertDescription className="text-green-700 mt-1 space-y-2">
                  <p>
                    {isPaid
                      ? "Your payment has been processed successfully."
                      : "We are processing your payment."}
                  </p>
                  {formData.statusMessage && (
                    <div className="text-sm bg-white/50 dark:bg-surface p-2 rounded-md">
                      {formData.statusMessage}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-surface p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Request Status
              </h3>
              <div className="flex items-center justify-between">
                <Badge variant={getStatusVariant()} className="text-sm">
                  {formData.status}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {updatedAt}
                </span>
              </div>
              {isProcessing && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Your request is being processed. You'll be notified when it's
                  complete.
                </p>
              )}
            </div>
            <div className="bg-white dark:bg-surface p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Payment
              </h3>
              <div className="flex items-center justify-between">
                <Badge variant={getPaymentStatusVariant()} className="text-sm">
                  {formData.paymentStatus}
                </Badge>
                <span className="text-sm font-medium">{totalCost}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Paid on: {createdAt}</p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-white/5 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Verification Request #{formData.reference}
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Submitted on {formatDate(formData.createdAt)}
                </CardDescription>
              </div>
              <div className="mt-3 sm:mt-0 flex items-center space-x-2">
                <Badge
                  variant={
                    formData.status === "Completed" ? "default" : "secondary"
                  }
                  className="text-sm"
                >
                  {formData.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Property Information
                  </h3>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formData.address || "No address provided"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formData.lga || "N/A"}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Parcel ID: {formData.parcelId || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Request Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Reference</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formData.reference}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Submitted On
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">{createdAt}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Last Updated
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">{updatedAt}</span>
                    </div>
                    {formData.description && (
                      <div className="pt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Description
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {formData.description}
                        </p>
                      </div>
                    )}
                    {formData.statusMessage && (
                      <div className="mt-2 p-3 bg-blue-50 text-blue-700 text-sm rounded-md">
                        {formData.statusMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Contact Information
                  </h3>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formData.requester || "No name provided"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formData.email}
                      </span>
                    </div>
                    {formData.userPhoneNumber && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formData.userPhoneNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Payment Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(formData.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Payment Date
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(formData.paymentDate || formData.updatedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Payment Method
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formData.paymentMethod || "Online Payment"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Preview */}
        {formData.lat && formData.lng && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Property Location
              </CardTitle>
              <CardDescription className="text-sm">
                View the property location on the map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                <a
                  href={`https://www.google.com/maps?q=${formData.lat},${formData.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  View on Google Maps
                </a>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Coordinates: {formData.lat.toFixed(6)},{" "}
                {formData.lng.toFixed(6)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Documents Section */}
        {formData.documentsUrls?.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formData.documentsUrls
                  .slice(0, 4)
                  .map((doc: string, index: number) => (
                    <a
                      key={index}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span className="truncate">
                        {doc
                          .split("/")
                          .pop()
                          ?.replace(/_/g, " ")
                          .replace(".pdf", "") || `Document ${index + 1}`}
                      </span>
                    </a>
                  ))}
                {formData.documentsUrls.length > 4 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 col-span-full">
                    +{formData.documentsUrls.length - 4} more documents
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Download Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isReportReady ? (
              <div className="space-y-4">
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Report Ready</p>
                    <p className="text-sm">
                      Your due diligence report is ready for download.
                    </p>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <SecureDownloadDialog
                    label="Download Report"
                    reference={formData.reference}
                    email={formData.email}
                    target="report"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-700 p-3 rounded-md flex items-start gap-3">
                  <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="font-medium">Report in Progress</p>
                    <p className="text-sm">
                      {isProcessing
                        ? "Your report is being prepared. This may take some time."
                        : "Your request is being processed. The report will be available soon."}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p>
                    You'll receive an email notification when your report is
                    ready.
                  </p>
                  <p>In the meantime, you can check back here for updates.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isReportReady && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Report Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your due diligence report has been approved and is ready for
                download.
              </p>
              <SecureDownloadDialog
                label="Download Report"
                reference={formData.reference}
                email={formData.email}
                target="report"
              />
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button asChild className="flex-1">
            <Link
              href={`/reva/onetimerequest?reference=${
                formData.reference
              }&email=${encodeURIComponent(formData.email)}`}
              className="flex items-center justify-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              View Full Details
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link
              href="/reva/requestform"
              className="flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Make Another Request
            </Link>
          </Button>
        </div>

        {/* Support Information */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact our support team at{" "}
            <a
              href="mailto:support@reva.ng"
              className="text-blue-600 hover:underline"
            >
              support@reva.ng
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Reference: {formData.reference}
          </p>
        </div>

        {/* Status Message */}
        {formData.statusMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">{formData.statusMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const VerifyPayment = ({ formData }: { formData: any }) => {
  return <VerifyPaymentContent formData={formData} />;
};

export default VerifyPayment;
