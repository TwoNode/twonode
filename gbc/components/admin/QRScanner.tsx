"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkInGBCTicket } from "@/app/(projects)/(GBC)/actions/ticket-actions";
import { toast } from "sonner";
import { Camera, CheckCircle, XCircle, Scan } from "lucide-react";

export function QRScanner() {
  const [hasCamera, setHasCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      navigator?.mediaDevices &&
      typeof navigator?.mediaDevices?.getUserMedia === "function"
    ) {
      setHasCamera(true);
    } else {
      setHasCamera(false);
      setCameraError("getUserMedia not supported");
    }

    return () => {
      cleanup();
    };
  }, []);

  function cleanup() {
    scanningRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.label);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startScanning() {
    setCameraError("");
    setDebugInfo("Requesting camera access...");

    try {
      // Request camera with specific constraints
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      console.log("Requesting camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got stream:", stream);
      console.log("Video tracks:", stream.getVideoTracks());

      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error("No video tracks in stream");
      }

      streamRef.current = stream;
      setDebugInfo("Camera access granted, loading video...");

      if (!videoRef.current) {
        throw new Error("Video element not found");
      }

      const video = videoRef.current;

      // Set up video element
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.setAttribute("muted", "true");

      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video metadata timeout"));
        }, 10000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log("Video metadata loaded");
          console.log(
            "Video dimensions:",
            video.videoWidth,
            "x",
            video.videoHeight
          );
          resolve(true);
        };

        video.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error("Video error: " + e));
        };
      });

      // Play the video
      setDebugInfo("Starting video playback...");
      await video.play();
      console.log("Video playing");

      // Verify video is actually playing
      if (video.paused) {
        throw new Error("Video failed to play");
      }

      setIsScanning(true);
      scanningRef.current = true;
      setLastResult(null);
      setDebugInfo("Camera ready! Point at QR code");

      // Start scanning after a short delay
      setTimeout(() => {
        console.log("Starting scan loop");
        scanQRCode();
      }, 100);
    } catch (error: any) {
      console.error("Camera error:", error);
      const errorMsg =
        error.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : error.name === "NotFoundError"
          ? "No camera found on this device."
          : error.name === "NotReadableError"
          ? "Camera is in use by another application."
          : `Camera error: ${error.message}`;

      setCameraError(errorMsg);
      setDebugInfo(errorMsg);
      toast.error(errorMsg);
      cleanup();
    }
  }

  function stopScanning() {
    setDebugInfo("Stopping camera...");
    cleanup();
    setIsScanning(false);
    setDebugInfo("");
    setCameraError("");
  }

  async function scanQRCode() {
    if (!scanningRef.current) {
      console.log("Scanning stopped");
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      console.log("Missing refs");
      requestAnimationFrame(scanQRCode);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    try {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        requestAnimationFrame(scanQRCode);
        return;
      }

      // Set canvas size to match video
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("Canvas sized:", canvas.width, "x", canvas.height);
      }

      // Draw current frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Scan for QR code
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data && !isProcessing) {
        console.log("✅ QR Code detected:", code.data);
        setDebugInfo(`Found: ${code.data.substring(0, 30)}...`);
        setIsProcessing(true);

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }

        await handleQRCodeDetected(code.data);

        // Cooldown period
        setTimeout(() => {
          setIsProcessing(false);
          setDebugInfo("Ready to scan again");
        }, 3000);
      }
    } catch (error) {
      console.error("Scan error:", error);
    }

    // Continue scanning
    if (scanningRef.current) {
      requestAnimationFrame(scanQRCode);
    }
  }

  async function handleQRCodeDetected(qrData: string) {
    try {
      let ticketNumber = qrData;

      // Validate QR data is not empty
      if (!qrData || qrData.trim() === "") {
        toast.error("Empty QR code detected");
        setLastResult({
          success: false,
          error: "QR code contains no data",
        });
        return;
      }

      // Try to parse as JSON first (for QR codes with embedded ticket data)
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.ticketNumber) {
          // This is a structured QR code with hash - verify it on server
          try {
            const { verifyQRCodeHash } = await import(
              "@/app/(projects)/(GBC)/actions/qr-verification"
            );

            // Verify hash on server (no expiration check)
            const verification = await verifyQRCodeHash(qrData);

            if (!verification.valid) {
              toast.error(verification.error || "Invalid QR code");
              setLastResult({
                success: false,
                error: verification.error || "QR code verification failed",
              });
              return;
            }

            ticketNumber = verification.data!.ticketNumber;
            console.log("✅ QR code verified successfully:", ticketNumber);
          } catch (verifyError: any) {
            console.error("QR verification error:", verifyError);
            toast.error("Failed to verify QR code security");
            setLastResult({
              success: false,
              error: "QR code security verification failed",
            });
            return;
          }
        }
      } catch {
        // Not JSON, try URL parsing
        try {
          const url = new URL(qrData);
          const ticketParam =
            url.searchParams.get("ticket") ||
            url.searchParams.get("t") ||
            url.searchParams.get("id");
          if (ticketParam) {
            ticketNumber = ticketParam;
            console.log("🔗 Extracted ticket from URL:", ticketNumber);
          }
        } catch {
          // Use as-is (plain ticket number - legacy support)
          console.log(
            "📝 Using raw ticket data (legacy format):",
            ticketNumber
          );
        }
      }

      // Final validation before check-in
      if (!ticketNumber || ticketNumber.trim() === "") {
        toast.error("Could not extract ticket number from QR code");
        setLastResult({
          success: false,
          error: "Invalid QR code format",
        });
        return;
      }

      console.log("Processing ticket:", ticketNumber);

      // Attempt check-in
      const result = await checkInGBCTicket(ticketNumber.trim());

      if (result.success) {
        toast.success(result.message || "Check-in successful!");
        setLastResult({ success: true, data: result.data });
      } else {
        toast.error(result.error || "Check-in failed");
        setLastResult({
          success: false,
          error: result.error || "Check-in failed",
        });
      }
    } catch (error: any) {
      console.error("Unexpected error in handleQRCodeDetected:", error);
      const errorMessage = "An unexpected error occurred. Please try again";
      toast.error(errorMessage);
      setLastResult({
        success: false,
        error: errorMessage,
      });
    }
  }

  async function handleManualInput() {
    try {
      if (!manualInput.trim()) {
        toast.error("Please enter a ticket number");
        return;
      }

      // Basic format validation
      const ticketNumber = manualInput.trim();
      if (ticketNumber.length < 5) {
        toast.error("Ticket number is too short");
        setLastResult({
          success: false,
          error: "Invalid ticket number format",
        });
        return;
      }

      setIsProcessing(true);
      const result = await checkInGBCTicket(ticketNumber);

      if (result.success) {
        toast.success(result.message || "Check-in successful!");
        setLastResult({ success: true, data: result.data });
        setManualInput(""); // Clear input on success
      } else {
        toast.error(result.error || "Check-in failed");
        setLastResult({
          success: false,
          error: result.error || "Check-in failed",
        });
      }
    } catch (error: any) {
      console.error("Manual check-in error:", error);
      const errorMessage = "Failed to process check-in. Please try again";
      toast.error(errorMessage);
      setLastResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }

  if (!hasCamera) {
    return (
      <Card className="p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Camera Not Available</h3>
        <p className="text-gray-600 mb-6">
          Your browser or device doesn't support camera access.
        </p>
        {cameraError && (
          <p className="text-sm text-red-600 mb-4">{cameraError}</p>
        )}
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
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: isScanning ? "block" : "none" }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {isScanning ? (
            <>
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  <div className="w-64 h-64 border-4 border-white/50 rounded-lg relative">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>

                    {/* Scan line */}
                    {!isProcessing && (
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="scan-line"></div>
                      </div>
                    )}
                  </div>

                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-green-500 rounded-full p-4 animate-ping">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Scan className="w-4 h-4 animate-pulse" />
                    Point at QR code
                  </span>
                )}
              </div>

              {/* Debug */}
              {debugInfo && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-xs px-3 py-2 rounded backdrop-blur-sm font-mono">
                  {debugInfo}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Camera Ready</p>
                <p className="text-sm opacity-75">
                  Click Start to begin scanning
                </p>
                {cameraError && (
                  <p className="text-red-400 text-sm mt-2">{cameraError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white flex gap-4">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1" size="lg">
              <Camera className="mr-2 h-5 w-5" />
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              Stop Camera
            </Button>
          )}
        </div>
      </Card>

      {/* Manual Input */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">Or Enter Ticket Number Manually</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualInput()}
            placeholder="GBC2.0-XXXXXXXX"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleManualInput}>Check In</Button>
        </div>
      </Card>

      {/* Results */}
      {lastResult && (
        <Card
          className={`p-6 ${
            lastResult.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
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
                  ? "✓ Check-In Successful!"
                  : "✗ Check-In Failed"}
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

      <style jsx>{`
        .scan-line {
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #4ade80, transparent);
          box-shadow: 0 0 10px #4ade80;
          animation: scan 2s ease-in-out infinite;
        }

        @keyframes scan {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(256px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
