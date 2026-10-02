import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  MapPin,
  FileText,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Map,
  Home,
  FileCheck,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Format currency helper
const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return String(amount);
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num) ? String(amount) : `₦${num.toLocaleString()}`;
};

// Format date helper
const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return String(dateString);
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? String(dateString) : format(date, "PPP p");
  } catch (error) {
    return String(dateString);
  }
};

interface OneTimeRequestViewProps {
  request: {
    id: string;
    reference: string;
    requester: string;
    description: string | null;
    status: string;
    paymentStatus: string;
    statusMessage: string | null;
    email: string;
    userPhoneNumber: string | null;
    address: string;
    lat: number;
    lng: number;
    lga: string;
    parcelId: string;
    totalCost: number;
    documentsUrls: string[];
    site_images: string[];
    comments: string;
    isLive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    report: any;
  };
}

export function OneTimeRequestView({ request }: OneTimeRequestViewProps) {
  const isReportReady = request?.report?.isApproved === true;
  const isProcessing = request.status === "Processing";
  const isCompleted = request.status === "Completed";
  const isPaid = request.paymentStatus === "Paid";

  // Format dates
  const createdAt = formatDate(request.createdAt);
  const updatedAt = formatDate(request.updatedAt);
  const totalCost = formatCurrency(request.totalCost);

  // Get status badge variant and icon
  const getStatusConfig = () => {
    if (isCompleted)
      return {
        variant: "default" as const,
        icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
      };
    if (isProcessing)
      return {
        variant: "secondary" as const,
        icon: <Clock className="h-4 w-4 mr-2" />,
      };
    return {
      variant: "outline" as const,
      icon: <AlertCircle className="h-4 w-4 mr-2" />,
    };
  };

  const { variant: statusVariant, icon: statusIcon } = getStatusConfig();

  return (
    <div className="space-y-6">
      {/* Header with Reference and Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Verification Request
          </h1>
          <p className="text-muted-foreground">
            Reference: {request.reference}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant} className="text-sm h-8 px-3">
            <div className="flex items-center">
              {statusIcon}
              {request.status}
            </div>
          </Badge>
          <Badge
            variant={isPaid ? "default" : ("destructive" as const)}
            className="h-8 px-3"
          >
            {request.paymentStatus}
          </Badge>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <p className="text-sm">
            This request is currently being processed. You'll be notified when
            there are updates.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property & Location */}
        <div className="space-y-6 lg:col-span-2">
          {/* Property Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Property Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Parcel ID
                  </p>
                  <p className="font-mono text-sm">{request.parcelId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Verification Fee
                  </p>
                  <p className="font-semibold">{totalCost}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="text-sm">
                  {request.description || "No description provided"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Location Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Location</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Address
                </p>
                <p className="text-sm">{request.address}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">LGA</p>
                <p className="text-sm">{request.lga}</p>
              </div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://maps.google.com/maps?q=${request.lat},${request.lng}&z=15&output=embed`}
                  className="border-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          {request.comments && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Comments</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.comments}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Request & Contact Info */}
        <div className="space-y-6">
          {/* Request Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Request Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Requested On
                </p>
                <p className="text-sm">{createdAt}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </p>
                <p className="text-sm">{updatedAt}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Reference
                </p>
                <p className="font-mono text-sm">{request.reference}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Requester
                </p>
                <p className="text-sm">{request.requester}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${request.email}`}
                    className="text-sm hover:underline"
                  >
                    {request.email}
                  </a>
                </div>
              </div>
              {request.userPhoneNumber && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Phone
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${request.userPhoneNumber}`}
                      className="text-sm hover:underline"
                    >
                      {request.userPhoneNumber}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents & Images */}
          {(request.documentsUrls?.length > 0 ||
            request.site_images?.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Attachments</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.documentsUrls?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Documents
                    </p>
                    <div className="space-y-2">
                      {request.documentsUrls.map((doc, index) => (
                        <a
                          key={index}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          Document {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {request.site_images?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Site Images
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {request.site_images.map((img, index) => (
                        <a
                          key={index}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-md border"
                        >
                          <img
                            src={img}
                            alt={`Site image ${index + 1}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon className="h-5 w-5 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Report Section */}
      {isReportReady && request.report && (
        <Card className="border-green-100 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">
                Verification Report
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Status</p>
                  <p className="text-green-800 font-medium">Approved</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={request.report.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </a>
                </Button>
              </div>
              {request.report.approvedAt && (
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Approved On
                  </p>
                  <p className="text-sm">
                    {formatDate(request.report.approvedAt)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" asChild>
          <Link
            href={`/reva/onetimerequest?reference=${request.reference}&email=${encodeURIComponent(request.email)}`}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            View Full Details
          </Link>
        </Button>
      </div>
    </div>
  );
}
