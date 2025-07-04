import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  CheckCircle,
  Download,
  FileText,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import DownloadReportButton from "../../onetimerequest/components/DownloadReportButton";

const VerifyPaymentContent = ({ formData }: { formData: any }) => {
  const isReportReady =
    formData?.report &&
    typeof formData.report === "object" &&
    "isApproved" in formData.report &&
    formData.report?.isApproved === true;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Payment Successful!
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Reference: {formData.reference}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  formData.status === "Completed" ? "default" : "secondary"
                }
              >
                {formData.status}
              </Badge>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Paid
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
          {/* Success Alert */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your payment has been successfully processed! Your request is now
              being reviewed by our team.
            </AlertDescription>
          </Alert>

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
                    {formData.description || "No description provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total Cost
                  </label>
                  <p className="text-gray-900 font-semibold">
                    ₦{formData.totalCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(formData.createdAt), "PPP")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(formData.updatedAt), "PPP")}
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
                  <p className="text-gray-900">{formData.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    LGA
                  </label>
                  <p className="text-gray-900">{formData.lga}</p>
                </div>
                {formData.parcelId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Parcel ID
                    </label>
                    <p className="text-gray-900">{formData.parcelId}</p>
                  </div>
                )}
                {formData.lat && formData.lng && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Coordinates
                    </label>
                    <p className="text-gray-900">
                      {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
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
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Name
                    </label>
                    <p className="text-gray-900">
                      {formData.requester || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    <p className="text-gray-900">{formData.email}</p>
                  </div>
                </div>
                {formData.userPhoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="text-gray-900">
                        {formData.userPhoneNumber}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Section */}
          {formData.documentsUrls && formData.documentsUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Supporting Documents
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
                    <div className="text-xs text-gray-500 col-span-full">
                      +{formData.documentsUrls.length - 4} more documents
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Download Section */}
          {isReportReady && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Report Ready
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Your due diligence report has been approved and is ready for
                  download.
                </p>
                <DownloadReportButton
                  reference={formData.reference}
                  email={formData.email}
                />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button asChild className="flex-1">
              <Link
                href={`/reva/onetimerequest?reference=${
                  formData.reference
                }&email=${encodeURIComponent(formData.email)}`}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                View Full Details
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/reva/requestform">Make Another Request</Link>
            </Button>
          </div>

          {/* Status Message */}
          {formData.statusMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">{formData.statusMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VerifyPayment = ({ formData }: { formData: any }) => {
  return (
    <div>
      <VerifyPaymentContent formData={formData} />
    </div>
  );
};

export default VerifyPayment;
