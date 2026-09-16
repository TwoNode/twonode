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
import { getOneTimeRequestByReference } from "@/reva/services/propertyRequestService";
import { OneTimeRequest } from "./OneTimeRequest";

interface PageProps {
  searchParams: {
    reference?: string;
    email?: string;
  };
}

export default async function OneTimeRequestPage({ searchParams }: PageProps) {
  const { reference, email } = await searchParams;

  if (!reference || !email) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-white/5 flex items-center justify-center p-4">
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

  let request;
  try {
    request = await getOneTimeRequestByReference(reference, email);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-white/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Request Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Unable to find your request. Please verify your reference and email, or contact support if you believe this is an error.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OneTimeRequest data={request} />;
}
