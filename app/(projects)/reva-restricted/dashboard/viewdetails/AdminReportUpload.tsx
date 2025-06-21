"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export type ReportType = {
  // Front page
  centroid: string | null;
  hasTitleRegistration: boolean;
  hasHistoricalSurveyRecord: boolean;

  // Page 1: Title Investigation (Lands Bureau)
  titleStatus: string;
  titleDate: string | null;
  titleName: string | null;
  titleNumber: string;
  transactionFlow: string;
  rightToSellHolder: string;

  // Page 2: Parcel Investigation (Office of the State Surveyor General)
  surveyPlanNumber: string;
  parcelPositionMatch: string;
  parcelStatus: string;
  implicationOfParcelStatus: string | null;
  commitmentStatus: string | null;
  implicationOfCommitmentStatus: string | null;
  parcelSetbacks: string;
  implicationOfParcelSetbacks: string | null;
  surveyName: string;
  latestSurveyPlanNumber: string;
  dateOnSurveyPlan: string | null;
  historicalSurveys: string;

  // Page 3: Parcel Investigation (Physical Planning)
  zoning: string;
  hasBuildingPlanApproval: boolean;
  buildingPlanNo: string;

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

  const [form, setForm] = useState<ReportType>({
    // Front page
    centroid: null,
    hasTitleRegistration: false,
    hasHistoricalSurveyRecord: false,

    // Page 1: Title Investigation
    titleStatus: "",
    titleDate: null,
    titleName: null,
    titleNumber: "",
    transactionFlow: "",
    rightToSellHolder: "",

    // Page 2: Parcel Investigation (Survey)
    surveyPlanNumber: "",
    parcelPositionMatch: "",
    parcelStatus: "",
    implicationOfParcelStatus: null,
    commitmentStatus: null,
    implicationOfCommitmentStatus: null,
    parcelSetbacks: "",
    implicationOfParcelSetbacks: null,
    surveyName: "",
    latestSurveyPlanNumber: "",
    dateOnSurveyPlan: null,
    historicalSurveys: "",

    // Page 3: Parcel Investigation (Planning)
    zoning: "",
    hasBuildingPlanApproval: false,
    buildingPlanNo: "",

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
    setForm((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [key]: file,
      },
    }));
  };

  const handleSubmitBtnClick = () => {
    const baseRequiredFields: (keyof ReportType)[] = [
      "surveyPlanNumber",
      "parcelPositionMatch",
      "parcelStatus",
      "zoning",
    ];

    const titleRegistrationFields: (keyof ReportType)[] =
      form.hasTitleRegistration
        ? [
            "titleStatus",
            "titleNumber",
            "titleDate",
            "titleName",
            "rightToSellHolder",
            "transactionFlow",
          ]
        : [];

    const historicalSurveyFields: (keyof ReportType)[] =
      form.hasHistoricalSurveyRecord
        ? [
            "surveyName",
            "latestSurveyPlanNumber",
            "dateOnSurveyPlan",
            "historicalSurveys",
          ]
        : [];

    const buildingPlanFields: (keyof ReportType)[] =
      form.hasBuildingPlanApproval ? ["buildingPlanNo"] : [];

    const requiredFields = [
      ...baseRequiredFields,
      ...titleRegistrationFields,
      ...historicalSurveyFields,
      ...buildingPlanFields,
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

      Object.entries(form).forEach(([key, value]) => {
        if (
          key === "images" &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          Object.entries(value as Record<string, File | null>).forEach(
            ([imgKey, imgFile]) => {
              if (imgFile) formData.append(imgKey, imgFile);
            }
          );
        } else if (value !== null) {
          formData.append(key, value as string);
        }
      });

      let prevImages: Record<string, string> = {};
      if (property?.report?.images) {
        Object.entries(property?.report?.images).forEach(([key, value]) => {
          if (value) {
            prevImages[key] = value as string;
          }
        });
      }

      formData.append("prevImages", JSON.stringify(prevImages));
      const response = await uploadDueDiligenceReport(formData);

      if (response?.error) {
        notifyError("Error saving form data");
        throw response?.error || new Error("An error occurred");
      }

      notifySuccess("Report data saved successfully!");
    } catch (err) {
      notifyError(
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Error saving form data"
      );
      console.warn(err);
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

      const response = await approveDueDiligenceReport(
        property?.reference || "",
        !property?.report?.isApproved
      );

      if (response?.error) {
        throw response?.error || new Error("An error occurred");
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
        <div className="fixed z-[999] inset-0 flex justify-center items-center bg-white bg-opacity-75">
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
        <Card>
          <CardContent className="p-6 space-y-8">
            {/* Front Page Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-2">Front Page</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label>Centroid Coordinates</Label>
                  <Textarea
                    placeholder="Enter centroid coordinates (latitude, longitude)"
                    value={form.centroid || ""}
                    onChange={(e) => handleChange("centroid", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Page 1: Title Investigation (Lands Bureau) */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-2">
                Page 1: Title Investigation (Lands Bureau)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-4 p-4 border rounded-lg lg:col-span-3">
                  <Switch
                    id="hasTitleRegistration"
                    checked={form.hasTitleRegistration}
                    onCheckedChange={(val) =>
                      handleChange("hasTitleRegistration", val)
                    }
                  />
                  <Label htmlFor="hasTitleRegistration" className="text-lg">
                    Has Title Registration
                  </Label>
                </div>

                {form.hasTitleRegistration && (
                  <>
                    <div>
                      <Label>Title Status</Label>
                      <select
                        value={form.titleStatus}
                        onChange={(e) =>
                          handleChange("titleStatus", e.target.value)
                        }
                        className="w-full border rounded p-2"
                        required
                      >
                        <option value="">Select...</option>
                        <option value="duly">
                          is a duly registered instrument
                        </option>
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
                        onChange={(e) =>
                          handleChange("titleNumber", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Title Date</Label>
                      <Input
                        type="date"
                        value={form.titleDate || ""}
                        onChange={(e) =>
                          handleChange("titleDate", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Title Name</Label>
                      <Input
                        placeholder="Name on title"
                        value={form.titleName || ""}
                        onChange={(e) =>
                          handleChange("titleName", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Right to Sell Holder</Label>
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
                        required
                      />
                    </div>

                    <div>
                      <Label>Transaction Flow Image</Label>
                      {imageUrls.transactionFlowImg && (
                        <img
                          src={imageUrls.transactionFlowImg}
                          alt="Transaction Flow"
                          className="w-32 h-32 object-cover rounded border"
                        />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageChange(
                            "transactionFlowImg",
                            e.target.files?.[0] || null
                          )
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Page 2: Parcel Investigation (Survey) */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-2">
                Page 2: Parcel Investigation (Office of the State Surveyor
                General)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-4 p-4 border rounded-lg lg:col-span-3">
                  <Switch
                    id="hasHistoricalSurveyRecord"
                    checked={form.hasHistoricalSurveyRecord}
                    onCheckedChange={(val) =>
                      handleChange("hasHistoricalSurveyRecord", val)
                    }
                  />
                  <Label
                    htmlFor="hasHistoricalSurveyRecord"
                    className="text-lg"
                  >
                    Has Historical Survey Record
                  </Label>
                </div>

                {form.hasHistoricalSurveyRecord && (
                  <>
                    <div>
                      <Label>Survey Name</Label>
                      <Input
                        placeholder="e.g LEGRANDE PROPERTY DEVELOPMENT COMPANY LTD"
                        value={form.surveyName}
                        onChange={(e) =>
                          handleChange("surveyName", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Latest Survey Plan Number</Label>
                      <Input
                        placeholder="Latest survey plan number"
                        value={form.latestSurveyPlanNumber || ""}
                        onChange={(e) =>
                          handleChange("latestSurveyPlanNumber", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Date on Survey Plan</Label>
                      <Input
                        type="date"
                        value={form.dateOnSurveyPlan || ""}
                        onChange={(e) =>
                          handleChange("dateOnSurveyPlan", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <Label>Historical Surveys</Label>
                      <Textarea
                        placeholder="List all historical survey records..."
                        value={form.historicalSurveys}
                        onChange={(e) =>
                          handleChange("historicalSurveys", e.target.value)
                        }
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Survey Plan Number</Label>
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
                  <Label>Parcel Check Image</Label>
                  {imageUrls.parcelCheck && (
                    <img
                      src={imageUrls.parcelCheck}
                      alt="Parcel Check"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "parcelCheck",
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Parcel Status</Label>
                  <Input
                    placeholder="e.g Free from any known Government Acquisition"
                    value={form.parcelStatus}
                    onChange={(e) =>
                      handleChange("parcelStatus", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Implication of Parcel Status</Label>
                  <Input
                    placeholder="Implications..."
                    value={form.implicationOfParcelStatus || ""}
                    onChange={(e) =>
                      handleChange("implicationOfParcelStatus", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Commitment Status</Label>
                  <Input
                    placeholder="Commitment status..."
                    value={form.commitmentStatus || ""}
                    onChange={(e) =>
                      handleChange("commitmentStatus", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Implication of Commitment Status</Label>
                  <Input
                    placeholder="Implications..."
                    value={form.implicationOfCommitmentStatus || ""}
                    onChange={(e) =>
                      handleChange(
                        "implicationOfCommitmentStatus",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Parcel Setbacks</Label>
                  <Input
                    placeholder="e.g Falls partly within the offset of the Open Canal"
                    value={form.parcelSetbacks}
                    onChange={(e) =>
                      handleChange("parcelSetbacks", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Implication of Parcel Setbacks</Label>
                  <Input
                    placeholder="Implications..."
                    value={form.implicationOfParcelSetbacks || ""}
                    onChange={(e) =>
                      handleChange(
                        "implicationOfParcelSetbacks",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Parcel Charting Free Image</Label>
                  {imageUrls.parcelChartingFree && (
                    <img
                      src={imageUrls.parcelChartingFree}
                      alt="Parcel Charting Free"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "parcelChartingFree",
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Parcel Charting Offset Image</Label>
                  {imageUrls.parcelChartingOffset && (
                    <img
                      src={imageUrls.parcelChartingOffset}
                      alt="Parcel Charting Offset"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "parcelChartingOffset",
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Page 3: Parcel Investigation (Physical Planning) */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-2">
                Page 3: Parcel Investigation (Physical Planning)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label>Zoning</Label>
                  <Input
                    placeholder="e.g Residential, Commercial, Agricultural"
                    value={form.zoning}
                    onChange={(e) => handleChange("zoning", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Land Use Check Image</Label>
                  {imageUrls.landUseCheck && (
                    <img
                      src={imageUrls.landUseCheck}
                      alt="Land Use Check"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "landUseCheck",
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>

                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Switch
                    id="hasBuildingPlanApproval"
                    checked={form.hasBuildingPlanApproval}
                    onCheckedChange={(val) =>
                      handleChange("hasBuildingPlanApproval", val)
                    }
                  />
                  <Label htmlFor="hasBuildingPlanApproval">
                    Building Plan Approval
                  </Label>
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
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-6">
              {user?.role === "SUPERADMIN" && (
                <>
                  {property?.report?.isApproved ? (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmApproval(true)}
                      className="w-full md:w-auto px-6 bg-red-500"
                    >
                      Disapprove Report
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmApproval(true)}
                      className="w-full md:w-auto px-6 bg-green-500 hover:bg-red-500"
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

        {/* Confirmation Dialogs */}
        <AlertDialog
          open={showConfirmApproval}
          onOpenChange={setShowConfirmApproval}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">
                Confirm Report Approval
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
                  Are you sure you want to approve this report and send it to
                  client's view?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
