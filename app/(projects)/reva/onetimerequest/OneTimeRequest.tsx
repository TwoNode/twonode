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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Download,
  FileText,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Home,
  Map,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin as Pin,
  FileSpreadsheet,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getOneTimeRequestByReference } from "@/app/(projects)/reva/actions/dbActions";
import DownloadReportButton from "./components/DownloadReportButton";

// Reva colors
const REVA_PRIMARY = "#0066CC";
const REVA_SECONDARY = "#003366";
const REVA_ACCENT = "#00A0E1";

interface PageProps {
  data:
    | {
        reference?: string;
        email?: string;
        status?: string;
        paymentStatus?: string;
        statusMessage?: string;
        error?: string;
        requester?: string;
        description?: string;
        address?: string;
        lat?: string;
        lng?: string;
        lga?: string;
        parcelId?: string;
        totalCost?: string;
        documentsUrls?: string[];
        site_images?: string[];
        comments?: string;
        isLive?: boolean;
        createdAt?: string;
        updatedAt?: string;
        report?: {
          isApproved?: boolean;
          comments?: string;
        };
      }
    | any;
}

export async function OneTimeRequest({ data }: PageProps) {
  // The data prop is the request object with the structure we expect
  const request = data;
  const isReportReady =
    request?.report &&
    typeof request.report === "object" &&
    "isApproved" in request.report &&
    request.report?.isApproved === true;

  // Helper function to safely format dates
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return String(dateString);
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? "Invalid date" : format(date, "PPP");
    } catch (error) {
      return String(dateString);
    }
  };

  // Helper function to safely format currency
  const formatCurrency = (amount?: number | string | null): string => {
    if (amount === null || amount === undefined) return String(amount);
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return isNaN(num) ? String(amount) : `₦${num.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Image
                  src="/reva/revaLogo.png"
                  alt="Reva Logo"
                  width={40}
                  height={40}
                  className="h-10 w-auto"
                />
                <span className="ml-2 text-2xl font-bold text-gray-900">
                  REVA
                </span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-sm font-medium text-gray-600">
                Property Verification
              </span>
            </div>
            <div className="hidden md:block">
              <Button
                variant="ghost"
                className="text-gray-700 hover:bg-gray-100"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Property Verification Request
              </h1>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Reference ID:</span>{" "}
                {request.reference}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <Badge
                className={`px-3 py-1.5 text-sm font-medium ${
                  request.status === "Completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {request.status === "Completed" ? (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                ) : (
                  <Clock className="h-4 w-4 mr-1.5" />
                )}
                {request.status}
              </Badge>
              <Badge
                className={`px-3 py-1.5 text-sm font-medium ${
                  request.paymentStatus === "Paid"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <DollarSign className="h-4 w-4 mr-1.5" />
                {request.paymentStatus}
              </Badge>
              {isReportReady ? (
                <Badge className="bg-green-100 text-green-800 px-3 py-1.5 text-sm font-medium">
                  <FileCheck className="h-4 w-4 mr-1.5" />
                  Report Approved
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1.5 text-sm font-medium">
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  Pending Approval
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Request Progress
              </h2>
              <span className="text-sm text-gray-500">
                Created on {formatDate(request.createdAt)}
              </span>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full"></div>
              <div
                className={`absolute top-0 left-0 h-1 transition-all duration-500 ${
                  request.status === "Completed"
                    ? "w-full bg-green-500"
                    : request.status === "In Progress"
                    ? "w-2/3 bg-blue-500"
                    : "w-1/3 bg-blue-300"
                }`}
              ></div>

              <div className="flex justify-between mt-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                      request.status === "Completed" ||
                      request.status === "In Progress" ||
                      request.status === "Submitted"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      request.status === "Completed" ||
                      request.status === "In Progress" ||
                      request.status === "Submitted"
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    Submitted
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                      request.status === "Completed" ||
                      request.status === "In Progress"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      request.status === "Completed" ||
                      request.status === "In Progress"
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    In Progress
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                      request.status === "Completed"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      request.status === "Completed"
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-gray-200 rounded-lg overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Request Information
                    </CardTitle>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {request.reference}
                    </span>
                  </div>
                  <CardDescription className="mt-1 text-sm text-gray-500">
                    Submitted on {formatDate(request.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Description
                      </label>
                      <p className="text-gray-900">
                        {request.description || "No description provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Total Cost
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {formatCurrency(request.totalCost)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Created
                      </label>
                      <p className="text-gray-900">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Last Updated
                      </label>
                      <p className="text-gray-900">
                        {formatDate(request.updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <User className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">
                          Requester
                        </h3>
                      </div>
                      <p className="ml-7 text-base font-medium text-gray-900">
                        {request.requester || "N/A"}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Mail className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">
                          Email
                        </h3>
                      </div>
                      <p className="ml-7 text-base font-medium text-gray-900">
                        {request.email}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Phone className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">
                          Phone
                        </h3>
                      </div>
                      <p className="ml-7 text-base font-medium text-gray-900">
                        {request.userPhoneNumber || "N/A"}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Clock className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">
                          Status
                        </h3>
                      </div>
                      <div className="ml-7">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-sm font-medium text-gray-700">
                        Description
                      </h3>
                    </div>
                    <p className="ml-7 text-sm text-gray-700">
                      {request.description || "No description provided."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Requester Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Requester Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Email
                        </label>
                        <p className="text-gray-900">{request.email}</p>
                      </div>
                    </div>
                    {request.userPhoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Phone
                          </label>
                          <p className="text-gray-900">
                            {request.userPhoneNumber}
                          </p>
                        </div>
                      </div>
                    )}
                    {request.requester && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Requester Name
                        </label>
                        <p className="text-gray-900">{request.requester}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Map Preview */}
              {request.lat && request.lng && (
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
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <a
                        href={`https://www.google.com/maps?q=${request.lat},${request.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        View on Google Maps
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Coordinates: {request.lat.toFixed(6)},{" "}
                      {request.lng.toFixed(6)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              {request.documentsUrls && request.documentsUrls.length > 0 && (
                <Card className="border border-gray-200 rounded-lg overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Documents
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {request.documentsUrls.length} document(s) attached
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {request.documentsUrls.map(
                        (doc: string, index: number) => (
                          <Link
                            key={index}
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Document {index + 1}
                          </Link>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isReportReady && (
                <Card>
                  <CardHeader>
                    <CardTitle>Report Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        Your report is currently under review. You will be
                        notified via email once it's ready for download.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {isReportReady && (
                <Card>
                  <CardHeader>
                    <CardTitle>Report Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        Your report has been approved and is ready for download.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* Status Messages */}
              {request.statusMessage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-900">{request.statusMessage}</p>
                  </CardContent>
                </Card>
              )}

              {/* Error Messages */}
              {request.error && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      Error Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-600">{request.error}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
