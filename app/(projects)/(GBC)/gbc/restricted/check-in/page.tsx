"use client";

import { QRScanner } from "../../../components/admin/QRScanner";
import { QRImageUpload } from "../../../components/admin/QRImageUpload";
import { ManualCheckIn } from "../../../components/admin/ManualCheckIn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

function LoadingFallback() {
  return (
    <Card className="p-8 text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Loading check-in system...</p>
    </Card>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Card className="p-8 text-center border-red-200 bg-red-50">
      <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2 text-red-900">
        Failed to Load Check-In System
      </h3>
      <p className="text-red-700 mb-4">
        An error occurred while loading the check-in interface.
      </p>
      <p className="text-sm text-red-600 mb-4">
        {error.message || "Unknown error"}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Reload Page
      </button>
    </Card>
  );
}

export default function CheckInPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Check-In Attendees
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Scan QR codes, upload QR images, or manually search for attendees to
          check them in
        </p>
      </div>

      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
          <TabsTrigger value="upload">Upload QR</TabsTrigger>
          <TabsTrigger value="manual">Manual Search</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <QRScanner />
          </Suspense>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <QRImageUpload />
          </Suspense>
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <ManualCheckIn />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
