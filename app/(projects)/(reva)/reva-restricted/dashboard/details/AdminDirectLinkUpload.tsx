"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import { revaApi } from "@/reva/apiClient";
import { REVA_COLORS, revaStatusBadgeStyle } from "@/reva/colors";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MediaLink } from "@/components/media";

export type FormState = {
  directFileLink: File | null;
  link: string;
};

export function AdminDirectLinkUpload({
  property,
  user = {},
  viewerRole = null,
}: {
  property: any;
  user: any;
  viewerRole?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmApproval, setShowConfirmApproval] = useState(false);

  const [form, setForm] = useState<FormState>({
    directFileLink: null,
    link: "",
  });

  const handleFileChange = (file: File | null) => {
    if (!file || !(file instanceof File)) {
      notifyError("Please upload a valid file.");
      return;
    }

    setForm((prev) => ({ ...prev, directFileLink: file }));
  };

  useEffect(() => {
    const directLink = property?.report?.directFileLink || "";
    setForm((prev) => ({
      ...prev,
      link: directLink,
    }));
  }, [property]);

  const handleSubmitBtnClick = () => {
    const requiredFields: (keyof FormState)[] = ["directFileLink"];

    const missingFields = requiredFields.filter((field) => !form[field]);

    if (missingFields.length > 0) {
      notifyError(
        `Please provide required field(s): ${missingFields
          .map((field) => field.replace(/([A-Z])/g, " $1").toUpperCase())
          .join(", ")}`
      );
      return;
    }

    formRef.current?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    notifyInfo("File submission in progress...");
    setShowConfirm(false);
    setIsLoading(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return; // Prevent multiple submissions

    try {
      setIsLoading(true);

      const formData = new FormData();
      if (!property?.reference) {
        throw new Error("Missing property reference");
      }
      formData.append("reference", property.reference);

      // Add isOneTimeRequest flag to the form data
      formData.append(
        "isOneTimeRequest",
        property?.isOneTimeRequest ? "true" : "false"
      );

      const file = form.directFileLink;

      if (!file || !(file instanceof File)) {
        throw new Error("Please upload a valid file before submitting.");
      }

      // Validate file size (e.g., 50MB limit)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        throw new Error(
          `File size exceeds the maximum limit of ${
            maxFileSize / (1024 * 1024)
          }MB`
        );
      }

      formData.append("directLink", file);

      const response = await revaApi.admin.requests.uploadReport(
        property.reference,
        formData
      );

      if (!response.success) {
        console.error("Upload error:", response.error);
        throw new Error(response.error || "Upload failed. Please try again.");
      }

      notifySuccess("File uploaded successfully!");

      // Optionally refresh the page or update the UI
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      notifyError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      if (!property?.report) {
        notifyError("Invalid report data. Unable to approve.");
        setIsLoading(false);
        return;
      }

      // The route itself picks approveDueDiligenceReport/approveOneTimeDueDiligenceReport by request type
      const response = await revaApi.admin.requests.approve(
        property?.reference || "",
        !property?.report?.isApproved
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      notifySuccess(
        property?.report?.isApproved
          ? "Report disapproved successfully!"
          : "Report approved successfully!"
      );
      setShowConfirmApproval(false);
    } catch (err) {
      notifyError(
        "An error occurred while approving the report. Please try again."
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 flex justify-center items-center bg-white dark:bg-surface bg-opacity-75 z-999">
          <svg
            className="animate-spin h-8 w-8"
            style={{ color: REVA_COLORS.primary.light }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-6 p-6 w-full mx-auto"
      >
        {/* {JSON.stringify(property?.report)} */}

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label>Upload Report File</Label>

              {property?.report?.directFileLink && (
                <div className="rounded border bg-muted p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      Previously uploaded file
                    </div>
                    <MediaLink
                      href={property.report.directFileLink}
                      className="underline text-sm"
                      style={{ color: REVA_COLORS.primary.light }}
                    >
                      View
                    </MediaLink>
                  </div>

                  <iframe
                    src={property.report.directFileLink}
                    title="Report Preview"
                    className="w-full h-72 rounded border"
                  />
                </div>
              )}

              <div className="space-y-1">
                {form?.directFileLink ? (
                  <>
                    <div className="rounded border bg-muted p-4 flex justify-between items-center">
                      <div className="text-sm">
                        <div className="font-medium">
                          {form.directFileLink.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(form.directFileLink.size / 1024).toFixed(2)} KB ·{" "}
                          {form.directFileLink.type || "Unknown type"}
                        </div>
                      </div>
                      <MediaLink
                        href={URL.createObjectURL(form.directFileLink)}
                        name={form.directFileLink.name}
                        className="underline text-sm"
                        style={{ color: REVA_COLORS.primary.light }}
                      >
                        Preview Selected File
                      </MediaLink>
                    </div>
                  </>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg p-6 text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No Direct file documents uploaded
                    </p>
                    {/* <Button className="mt-4">Upload Document</Button> */}
                  </div>
                )}
              </div>

              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              {form.directFileLink && (
                <p
                  className="text-sm"
                  style={{ color: REVA_COLORS.status.success }}
                >
                  File ready to upload
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-end gap-6 pt-6">
              {viewerRole === "SUPERADMIN" && (
                <>
                  {property?.report?.isApproved ? (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmApproval(true)}
                      className="w-full md:w-auto px-6 hover:opacity-90"
                      style={{ backgroundColor: REVA_COLORS.status.error }}
                    >
                      Disapprove Report
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmApproval(true)}
                      className="w-full md:w-auto px-6 hover:opacity-90"
                      style={{ backgroundColor: REVA_COLORS.status.success }}
                    >
                      Approve Report
                    </Button>
                  )}
                </>
              )}

              <Button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="w-full md:w-auto px-6"
              >
                Submit Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <AlertDialog
            open={showConfirmApproval}
            onOpenChange={setShowConfirmApproval}
          >
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">
                  Confirm Report{" "}
                  {property?.report?.isApproved ? (
                    <span className="p-2" style={revaStatusBadgeStyle("error")}>
                      Disapprove Report
                    </span>
                  ) : (
                    <span
                      className="p-2"
                      style={revaStatusBadgeStyle("success")}
                    >
                      Approve Report
                    </span>
                  )}
                </AlertDialogTitle>

                <AlertDialogDescription>
                  <div className="space-y-4 text-sm mt-4 p-4 bg-muted rounded border max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-medium text-muted-foreground">
                        Direct File Link:
                      </span>
                      <span className="text-right text-foreground wrap-break-word">
                        {form.directFileLink ? (
                          form.directFileLink?.name
                        ) : (
                          <span className="italic text-muted">(empty)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <p
                    className="text-sm mt-6"
                    style={{ color: REVA_COLORS.status.error }}
                  >
                    Are you sure you want to{" "}
                    {property?.report?.isApproved ? "disapprove" : "approve"}{" "}
                    this report and make it visible to the client?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="pt-4">
                <AlertDialogCancel
                  onClick={() => setShowConfirmApproval(false)}
                >
                  Cancel
                </AlertDialogCancel>{" "}
                <AlertDialogCancel>
                  {property?.report?.isApproved ? (
                    <Button
                      type="button"
                      onClick={handleApprove}
                      className="w-full md:w-auto px-6"
                      style={{ backgroundColor: REVA_COLORS.status.error }}
                    >
                      Disapprove Report
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleApprove}
                      className="w-full md:w-auto px-6"
                      style={{ backgroundColor: REVA_COLORS.status.success }}
                    >
                      Approve Report
                    </Button>
                  )}
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">
                  Submit Report for Review
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-4 text-sm mt-4 p-4 bg-muted rounded border max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-medium text-muted-foreground">
                        Direct File Link:
                      </span>
                      <span className="text-right text-foreground wrap-break-word">
                        {form.directFileLink ? (
                          form.directFileLink.name
                        ) : (
                          <span className="italic text-muted">(empty)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-6">
                    Are you sure you want to submit this report for
                    Administrative Review?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pt-4">
                <AlertDialogCancel onClick={() => setShowConfirm(false)}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="button"
                  onClick={handleSubmitBtnClick}
                  className="w-full md:w-auto px-6"
                >
                  Submit Report
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </div>
  );
}
