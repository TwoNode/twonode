"use client";

import { QRScanner } from "../../../components/admin/QRScanner";
import { ManualCheckIn } from "../../../components/admin/ManualCheckIn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CheckInPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Check-In Attendees
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Scan QR codes or manually search for attendees to check them in
        </p>
      </div>

      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
          <TabsTrigger value="manual">Manual Search</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-6">
          <QRScanner />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <ManualCheckIn />
        </TabsContent>
      </Tabs>
    </div>
  );
}
