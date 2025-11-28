"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkInGBCTicket } from "../../actions/ticket-actions";
import { toast } from "sonner";
import { Upload, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";

export function QRImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (PNG, JPG, or WEBP)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setLastResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processQRCode = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error("Please select an image first");
      return;
    }

    setIsProcessing(true);
    toast.loading("Scanning QR code from image...");

    try {
      // Create an image element
      const img = new Image();
      img.src = previewUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      // Create canvas and draw image
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      context.drawImage(img, 0, 0);

      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Scan for QR code
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      toast.dismiss();

      if (!code || !code.data) {
        toast.error("No QR code found in the image. Please try another image.");
        setIsProcessing(false);
        return;
      }

      console.log(
        "✅ QR Code detected from image:",
        code.data,
        typeof code.data
      );

      // Extract ticket number
      let ticketNumber = code.data;

      // Try to parse as JSON first (for QR codes with embedded ticket data)
      try {
        const parsed = JSON.parse(code.data);
        if (parsed.ticketNumber) {
          ticketNumber = parsed.ticketNumber;
          console.log("📋 Extracted ticket from JSON:", ticketNumber);
        }
      } catch {
        // Not JSON, try URL parsing
        try {
          const url = new URL(code.data);
          const ticketParam =
            url.searchParams.get("ticket") ||
            url.searchParams.get("t") ||
            url.searchParams.get("id");
          if (ticketParam) {
            ticketNumber = ticketParam;
            console.log("🔗 Extracted ticket from URL:", ticketNumber);
          }
        } catch {
          // Use as-is (plain ticket number)
          console.log("📝 Using raw ticket data:", ticketNumber);
        }
      }

      console.log("Processing ticket:", ticketNumber);

      // Check in the ticket
      const result = await checkInGBCTicket(ticketNumber.trim());

      if (result.success) {
        toast.success(result.message || "Check-in successful!");
        setLastResult({ success: true, data: result.data });
      } else {
        toast.error(result.error || "Check-in failed");
        setLastResult({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error("QR processing error:", error);
      toast.dismiss();
      toast.error(error.message || "Failed to process QR code");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setLastResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Upload QR Code Image</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload a screenshot or photo containing a QR code to check in an
          attendee
        </p>

        <div className="space-y-4">
          {/* File Input */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              previewUrl
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="qr-upload"
            />

            {!previewUrl ? (
              <label htmlFor="qr-upload" className="cursor-pointer block">
                <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, or WEBP (max 10MB)
                </p>
              </label>
            ) : (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="QR Code Preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={processQRCode}
                    disabled={isProcessing}
                    size="lg"
                    className="min-w-[150px]"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Scan QR Code
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={clearSelection}
                    variant="outline"
                    disabled={isProcessing}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p>
                <span className="font-medium">File:</span> {selectedFile.name}
              </p>
              <p>
                <span className="font-medium">Size:</span>{" "}
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
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
                <div className="grid grid-cols-1 w-full max-w-full overflow-x-auto">
                  <p className="text-red-700 max-w-full text-ellipsis">
                    {lastResult.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold mb-2 text-blue-900">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Ensure the QR code is clearly visible in the image</li>
          <li>Avoid blurry or low-quality images</li>
          <li>The entire QR code should be within the image frame</li>
          <li>Good lighting helps improve scan accuracy</li>
        </ul>
      </Card>
    </div>
  );
}
