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
import { OneTimeRequest } from "./OneTimeRequest";

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

  interface OneTimeRequestResult {
    success: boolean;
    data?: any; // Make data optional to match the actual return type
    error?: string;
  }

  const result: OneTimeRequestResult = await getOneTimeRequestByReference(
    reference,
    email
  );

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

  if (!result.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Error Loading Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {result.error ||
                  "An error occurred while loading the request. Please try again later."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const request = result.data;

  return <OneTimeRequest data={request} />;
}
