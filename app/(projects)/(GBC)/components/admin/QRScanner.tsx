"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkInGBCTicket } from "../../actions/ticket-actions";
import { toast } from "sonner";
import { Camera, CheckCircle, XCircle } from "lucide-react";

export function QRScanner() {
  const [hasCamera, setHasCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if camera is available
    if (
      navigator?.mediaDevices &&
      typeof navigator?.mediaDevices?.getUserMedia === "function"
    ) {
      setHasCamera(true);
    }

    return () => {
      stopScanning();
    };
  }, []);

  async function startScanning() {
    try {
      const stream = await navigator?.mediaDevices?.getUserMedia?.({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Failed to access camera");
    }
  }

  function stopScanning() {
    if (streamRef.current) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }

  async function handleManualInput(ticketNumber: string) {
    if (!ticketNumber.trim()) return;

    const result = await checkInGBCTicket(ticketNumber.trim());

    if (result.success) {
      toast.success(result.message || "Check-in successful!");
      setLastResult({ success: true, data: result.data });
    } else {
      toast.error(result.error || "Check-in failed");
      setLastResult({ success: false, error: result.error });
    }
  }

  if (!hasCamera) {
    return (
      <Card className="p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Camera Not Available</h3>
        <p className="text-gray-600 mb-6">
          Your device doesn't support camera access or permission was denied.
        </p>
        <p className="text-sm text-gray-500">
          Use the Manual Search tab to check in attendees.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Camera View */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-gray-900">
          {isScanning ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50" />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Camera is off</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white flex gap-4">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="flex-1"
            >
              Stop Camera
            </Button>
          )}
        </div>
      </Card>

      {/* Manual Input */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">Or Enter Ticket Number Manually</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleManualInput(formData.get("ticketNumber") as string);
            e.currentTarget.reset();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name="ticketNumber"
            placeholder="GBC2.0-XXXXXXXX"
            className="flex-1 px-4 py-2 border rounded-lg"
            required
          />
          <Button type="submit">Check In</Button>
        </form>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Card
          className={`p-6 ${lastResult.success ? "bg-green-50" : "bg-red-50"}`}
        >
          <div className="flex items-start gap-4">
            {lastResult.success ? (
              <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600 shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">
                {lastResult.success
                  ? "Check-In Successful!"
                  : "Check-In Failed"}
              </h3>
              {lastResult.success && lastResult.data ? (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {lastResult.data.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {lastResult.data.email}
                  </p>
                  <p>
                    <span className="font-medium">Ticket:</span>{" "}
                    {lastResult.data.ticketNumber}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    {lastResult.data.ticketType.replace("_", " ")}
                  </p>
                </div>
              ) : (
                <p className="text-red-700">{lastResult.error}</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
