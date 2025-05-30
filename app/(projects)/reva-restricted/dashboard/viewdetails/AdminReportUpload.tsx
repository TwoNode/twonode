"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function AdminReportUpload() {
  const [form, setForm] = useState({
    titleStatus: "",
    titleNumber: "",
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
      transactionFlow: null,
      parcelCheck: null,
      parcelChartingFree: null,
      parcelChartingOffset: null,
      landUseCheck: null,
    },
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "images" && typeof value === "object") {
        Object.entries(value).forEach(([imgKey, imgFile]) => {
          if (imgFile) formData.append(imgKey, imgFile);
        });
      } else {
        formData.append(key, value as string);
      }
    });

    console.log("Sending form data");
    // TODO: POST formData to backend
    Object.entries(form).forEach(([key, value]) => {
      if (key === "images" && typeof value === "object") {
        Object.entries(value).forEach(([imgKey, imgFile]) => {
          console.log(
            `Image Label: ${imgKey.replace(/([A-Z])/g, " $1")}, Value: ${
              imgFile ? (imgFile as File).name : "No file uploaded"
            }`
          );
        });
      } else {
        console.log(
          `Label: ${key.replace(/([A-Z])/g, " $1")}, Value: ${value}`
        );
      }
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6 p-6 w-full mx-auto">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="block">Title Status</Label>
                <select
                  value={form.titleStatus}
                  onChange={(e) => handleChange("titleStatus", e.target.value)}
                  className="w-full border rounded p-2"
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
                  value={form.parcelPositionMatch}
                  onChange={(e) =>
                    handleChange("parcelPositionMatch", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Parcel Status Check</Label>
                <Input
                  placeholder="e.g Free from any known Government Acquisition"
                  value={form.parcelStatus}
                  onChange={(e) => handleChange("parcelStatus", e.target.value)}
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
                />
              </div>

              <div>
                <Label>Name on Survey</Label>
                <Input
                  placeholder="e.g LEGRANDE PROPERTY DEVELOPMENT COMPANY LTD"
                  value={form.surveyName}
                  onChange={(e) => handleChange("surveyName", e.target.value)}
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

              <div className="lg:col-span-3 space-y-4">
                <Label className="text-lg font-semibold">Upload Images</Label>
                {Object.keys(form.images).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize font-medium">
                      {key.replace(/([A-Z])/g, " $1")}
                    </Label>
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

            <div className="flex justify-end pt-6">
              <Button type="submit" className="w-full md:w-auto px-6">
                Submit Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
