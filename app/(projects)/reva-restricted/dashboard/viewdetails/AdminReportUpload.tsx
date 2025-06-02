"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import {
  approveDueDiligenceReport,
  uploadDueDiligenceReport,
} from "../../actions/adminDbActions";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type FormState = {
  titleStatus: string;
  titleNumber: string;
  rightToSellHolder: string;
  transactionFlow: string;
  parcelPositionMatch: string;
  parcelStatus: string;
  surveyPlanNumber: string;
  surveyName: string;
  historicalSurveys: string;
  zoning: string;
  hasBuildingPlanApproval: boolean;
  buildingPlanNo: string;
  setbacksInfo: string;
  images: {
    transactionFlowImg: File | null;
    parcelCheck: File | null;
    parcelChartingFree: File | null;
    parcelChartingOffset: File | null;
    landUseCheck: File | null;
  };
};

export function AdminReportUpload({
  property,
  user = {},
}: {
  property: any;
  user: any;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmApproval, setShowConfirmApproval] = useState(false);

  const [form, setForm] = useState<FormState>({
    titleStatus: "",
    titleNumber: "",
    rightToSellHolder: "",
    transactionFlow: "",
    parcelPositionMatch: "",
    parcelStatus: "",
    surveyPlanNumber: "",
    surveyName: "",
    historicalSurveys: "",
    zoning: "",
    hasBuildingPlanApproval: false,
    buildingPlanNo: "",
    setbacksInfo: "",
    images: {
      transactionFlowImg: null,
      parcelCheck: null,
      parcelChartingFree: null,
      parcelChartingOffset: null,
      landUseCheck: null,
    },
  });

  const imageUrls: Record<string, string> = property?.report?.images || {};

  useEffect(() => {
    const report = property?.report || {};
    setForm((prev) => ({
      ...prev,
      ...report,
      images: {
        transactionFlowImg: null,
        parcelCheck: null,
        parcelChartingFree: null,
        parcelChartingOffset: null,
        landUseCheck: null,
      },
    }));
  }, [property]);

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (key: string, file: File | null) => {
    console.warn(key, file);
    setForm((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [key]: file,
      },
    }));
  };

  const handleSubmitBtnClick = () => {
    const requiredFields: (keyof FormState)[] = [
      "titleStatus",
      "titleNumber",
      "rightToSellHolder",
      "parcelPositionMatch",
      "parcelStatus",
      "surveyPlanNumber",
      "surveyName",
      ...(form.hasBuildingPlanApproval
        ? ["buildingPlanNo" as keyof FormState]
        : []),
    ];

    const missingFields = requiredFields.filter((field) => !form[field]);

    if (missingFields.length > 0) {
      notifyError(
        `Please fill all required fields: ${missingFields
          .map((field) => field.replace(/([A-Z])/g, " $1").toUpperCase())
          .join(", ")}`
      );
      return;
    }

    formRef.current?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    notifyInfo("Report submission in progress.");
    setShowConfirm(false);
    setIsLoading(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("reference", property?.reference);

      console.log(form);

      Object.entries(form).forEach(([key, value]) => {
        if (key === "images" && typeof value === "object") {
          Object.entries(value).forEach(([imgKey, imgFile]) => {
            if (imgFile) formData.append(imgKey, imgFile);
          });
        } else {
          formData.append(key, value as string);
        }
      });

      let prevImages: Record<string, string> = {};

      if (
        property?.report?.images &&
        typeof property?.report?.images === "object"
      ) {
        Object.entries(property?.report?.images).forEach(([key, value]) => {
          if (value) {
            prevImages[key] = value as string;
          }
        });
      }

      formData.append("prevImages", JSON.stringify(prevImages));

      const response = await uploadDueDiligenceReport(formData);
      // console.log("Form data saved successfully:", response);

      if (
        typeof response === "object" &&
        "error" in response &&
        response.error
      ) {
        notifyError("Error saving form data");
        throw response?.error || new Error("An error occured");
      }

      notifySuccess("Report data saved successfully!");
    } catch (err) {
      // console.error("Error saving form data:", error);
      // console.warn(JSON.stringify(error));
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        (err as { message: string }).message.length < 35
      ) {
        notifyError(
          typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Error saving form data"
        );
      } else {
        notifyError("An error occured while processing, please try again");
      }

      console.warn(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      if (!property?.report || typeof property?.report !== "object") {
        notifyError("Invalid report data. Unable to approve.");
        setIsLoading(false);
        return;
      }

      const response = await approveDueDiligenceReport(
        property?.reference || ""
      );

      if (
        typeof response === "object" &&
        "error" in response &&
        response.error
      ) {
        throw response?.error || new Error("An error occurred");
      }

      notifySuccess("Report approved successfully!");
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
        <div className="fixed inset-0 flex justify-center items-center bg-white bg-opacity-75 z-50">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="block">Title Status</Label>
                <select
                  value={form.titleStatus}
                  onChange={(e) => handleChange("titleStatus", e.target.value)}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="">Select...</option>
                  <option value="duly">is a duly registered instrument</option>
                  <option value="not_duly">
                    is not a duly registered instrument
                  </option>
                </select>
              </div>

              <div>
                <Label>Title Number</Label>
                <Input
                  placeholder="e.g Number 33 Page 33 in Volume 2580"
                  value={form.titleNumber}
                  onChange={(e) => handleChange("titleNumber", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Who holds the right to sell the development?</Label>
                <Input
                  placeholder="e.g Mr Reva"
                  value={form.rightToSellHolder}
                  onChange={(e) =>
                    handleChange("rightToSellHolder", e.target.value)
                  }
                  required
                />
              </div>

              <div className="lg:col-span-3">
                <Label>Transaction Flow</Label>
                <Textarea
                  placeholder="List all transaction flow details..."
                  value={form.transactionFlow}
                  onChange={(e) =>
                    handleChange("transactionFlow", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Parcel Position Match (%)</Label>
                <Input
                  placeholder="e.g 99.99%"
                  type="number"
                  value={form.parcelPositionMatch}
                  max={100}
                  min={0}
                  required
                  onChange={(e) => {
                    const value = Math.max(
                      0,
                      Math.min(100, Number(e.target.value))
                    );
                    handleChange("parcelPositionMatch", value.toString());
                  }}
                />
              </div>

              <div>
                <Label>Parcel Status Check</Label>
                <Input
                  placeholder="e.g Free from any known Government Acquisition"
                  value={form.parcelStatus}
                  onChange={(e) => handleChange("parcelStatus", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Most recent lodged survey plan no.</Label>
                <Input
                  placeholder="e.g LS/D/LA/2580"
                  value={form.surveyPlanNumber}
                  onChange={(e) =>
                    handleChange("surveyPlanNumber", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label>Name on Survey</Label>
                <Input
                  placeholder="e.g LEGRANDE PROPERTY DEVELOPMENT COMPANY LTD"
                  value={form.surveyName}
                  onChange={(e) => handleChange("surveyName", e.target.value)}
                  required
                />
              </div>

              <div className="lg:col-span-3">
                <Label>Historical Survey Records</Label>
                <Textarea
                  placeholder="List all historical survey records..."
                  value={form.historicalSurveys}
                  onChange={(e) =>
                    handleChange("historicalSurveys", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Landuse Zoning</Label>
                <Input
                  placeholder="e.g Residential, Commercial, Agricultural"
                  value={form.zoning}
                  onChange={(e) => handleChange("zoning", e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={form.hasBuildingPlanApproval}
                  onCheckedChange={(val) =>
                    handleChange("hasBuildingPlanApproval", !!val)
                  }
                />
                <Label>Building Plan Approval</Label>
              </div>

              {form.hasBuildingPlanApproval && (
                <div>
                  <Label>Building Plan No</Label>
                  <Input
                    placeholder="e.g BP/LA/2025/0001"
                    value={form.buildingPlanNo}
                    required
                    onChange={(e) =>
                      handleChange("buildingPlanNo", e.target.value)
                    }
                  />
                </div>
              )}

              <div className="lg:col-span-3">
                <Label>Parcel on Setbacks</Label>
                <Textarea
                  placeholder="e.g Falls partly within the offset of the Open Canal"
                  value={form.setbacksInfo}
                  onChange={(e) => handleChange("setbacksInfo", e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <Label className="text-lg font-semibold">Upload Images</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.keys(form.images).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize font-medium">
                      {key.replace(/([A-Z])/g, " $1")}
                    </Label>

                    {imageUrls[key] && (
                      <img
                        src={imageUrls[key]}
                        alt={key}
                        className="w-32 h-32 object-cover rounded border"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageChange(key, e.target.files?.[0] || null)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-6">
              {user?.role! === "SUPERADMIN" && (
                <>
                  {property?.report?.isApproved ? (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmApproval(true)}
                      className={`w-full md:w-auto px-6 bg-red-500`}
                    >
                      Disapprove Report
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmApproval(true)}
                      className={`w-full md:w-auto px-6 bg-green-500 hover:bg-red-500`}
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

        <AlertDialog
          open={showConfirmApproval}
          onOpenChange={setShowConfirmApproval}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">
                Conform Report Approval
              </AlertDialogTitle>

              <AlertDialogDescription>
                <div className="max-h-80 overflow-y-auto mt-4 rounded-md border p-4 bg-muted text-sm space-y-4">
                  {Object.entries(form).map(([key, value]) => {
                    if (key === "images") return null;
                    const label = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase());
                    const displayValue =
                      typeof value === "boolean"
                        ? value
                          ? "Yes"
                          : "No"
                        : value;
                    return (
                      <div key={key} className="grid grid-cols-2 gap-4">
                        <span className="font-medium text-muted-foreground whitespace-nowrap">
                          {label}:
                        </span>
                        <span className="text-right break-words text-foreground">
                          {typeof displayValue === "object" ? (
                            <span className="italic text-muted">(object)</span>
                          ) : (
                            displayValue || (
                              <span className="italic text-muted">(empty)</span>
                            )
                          )}
                        </span>
                      </div>
                    );
                  })}

                  {/* Image Preview Section */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-base mb-2">
                      Uploaded Images
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(form.images).map(([imgKey, file]) => {
                        const label = imgKey
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase());
                        if (!file) return null;
                        const previewUrl = URL.createObjectURL(file);
                        return (
                          <div key={imgKey} className="text-center space-y-2">
                            <img
                              src={previewUrl}
                              alt={label}
                              className="w-full h-32 object-cover rounded border shadow-sm"
                            />
                            <div className="text-xs text-muted-foreground truncate">
                              {label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-6 text-red-500">
                  Are you sure you want to approve this report and sent it to
                  client's view?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="pt-4">
              <AlertDialogCancel onClick={() => setShowConfirm(false)}>
                Cancel
              </AlertDialogCancel>

              <Button
                type="button"
                onClick={handleApprove}
                className="w-full md:w-auto px-6 text-green-500"
              >
                Approve Report
              </Button>
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
                <div className="max-h-80 overflow-y-auto mt-4 rounded-md border p-4 bg-muted text-sm space-y-4">
                  {Object.entries(form).map(([key, value]) => {
                    if (key === "images") return null;
                    const label = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase());
                    const displayValue =
                      typeof value === "boolean"
                        ? value
                          ? "Yes"
                          : "No"
                        : value;

                    return (
                      <div key={key} className="grid grid-cols-2 gap-4">
                        <span className="font-medium text-muted-foreground whitespace-nowrap">
                          {label}:
                        </span>
                        <span className="text-right break-words text-foreground">
                          {typeof displayValue === "object" ? (
                            <span className="italic text-muted">(object)</span>
                          ) : (
                            displayValue || (
                              <span className="italic text-muted">(empty)</span>
                            )
                          )}
                        </span>
                      </div>
                    );
                  })}

                  {/* Image Preview Section */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-base mb-2">
                      Uploaded Images
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(form.images).map(([imgKey, file]) => {
                        const label = imgKey
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase());

                        if (!file) return null;

                        const previewUrl = URL.createObjectURL(file);

                        return (
                          <div key={imgKey} className="text-center space-y-2">
                            <img
                              src={previewUrl}
                              alt={label}
                              className="w-full h-32 object-cover rounded border shadow-sm"
                            />
                            <div className="text-xs text-muted-foreground truncate">
                              {label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-6">
                  Are you sure you want to submit this report for Administrative
                  Review?
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
      </form>
    </div>
  );
}
