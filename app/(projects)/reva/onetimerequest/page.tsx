import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import Link from "next/link";
import { getOneTimeRequestByReference } from "@/app/(projects)/reva/actions/dbActions";
import DownloadReportButton from "./components/DownloadReportButton";

interface PageProps {
  searchParams: {
    reference?: string;
    email?: string;
  };
}

export default async function OneTimeRequestPage({ searchParams }: PageProps) {
  const { reference, email } = searchParams;

  if (!reference || !email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Invalid Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Reference and email are required to access your OneTime request.
                Please check your email for the correct link or contact support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await getOneTimeRequestByReference(reference, email);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Request Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {result.error ||
                  "Unable to find your request. Please verify your reference and email, or contact support if you believe this is an error."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const request = result.data;
  const isReportReady =
    request?.report &&
    typeof request.report === "object" &&
    "isApproved" in request.report &&
    request.report?.isApproved === true;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                OneTime Request
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Reference: {request.reference}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  request.status === "Completed" ? "default" : "secondary"
                }
              >
                {request.status}
              </Badge>
              <Badge
                variant={
                  request.paymentStatus === "Paid" ? "default" : "destructive"
                }
              >
                {request.paymentStatus}
              </Badge>
              {isReportReady && (
                <Badge className="bg-green-500 text-white">Approved</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details
              </CardTitle>
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
                    ₦{request.totalCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(request.createdAt), "PPP")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(request.updatedAt), "PPP")}
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Address
                  </label>
                  <p className="text-gray-900">{request.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    LGA
                  </label>
                  <p className="text-gray-900">{request.lga}</p>
                </div>
                {request.parcelId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Parcel ID
                    </label>
                    <p className="text-gray-900">{request.parcelId}</p>
                  </div>
                )}
                {request.lat && request.lng && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Coordinates
                    </label>
                    <p className="text-gray-900">
                      {request.lat}, {request.lng}
                    </p>
                  </div>
                )}
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
                      <p className="text-gray-900">{request.userPhoneNumber}</p>
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

          {/* Documents */}
          {request.documentsUrls && request.documentsUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.documentsUrls.map((url: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="text-sm text-gray-600">
                        Document {index + 1}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          {request.comments && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900">{request.comments}</p>
              </CardContent>
            </Card>
          )}

          {/* Report Section */}
          {request.report ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Due Diligence Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant={isReportReady ? "default" : "secondary"}>
                      {isReportReady ? "Approved" : "Under Review"}
                    </Badge>
                    {typeof request.report === "object" &&
                      "approvedAt" in request.report &&
                      typeof request.report.approvedAt === "string" && (
                        <p className="text-sm text-gray-600 mt-1">
                          Approved on:{" "}
                          {format(new Date(request.report.approvedAt), "PPP")}
                        </p>
                      )}
                  </div>
                  {isReportReady && (
                    <DownloadReportButton
                      reference={request.reference}
                      email={request.email}
                    />
                  )}
                </div>

                {typeof request.report === "object" &&
                  "directFileLink" in request.report &&
                  typeof request.report.directFileLink === "string" && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        Direct Report Link:
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={request.report.directFileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Report
                        </Link>
                      </Button>
                    </div>
                  )}

                {!isReportReady && (
                  <Alert>
                    <AlertDescription>
                      Your report is currently under review. You will be
                      notified via email once it's approved and ready for
                      download.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Report Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Your report is being prepared. You will be notified via
                    email once it's ready for review.
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
  );
}
