"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSurfboardPlan } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import type {
  CreatePlanData,
  PillarData,
  FileUploadData,
} from "@/app/(projects)/(surboard)/types/surfboardTypes";
import MapPreview from "./MapPreview";
import {
  generatePolygonFromPillars,
  parseCSVContent,
} from "../../../utils/surfboardUtils";
import SurfboardCSVHeaderHelp from "@/components/SurfboardCSVHeaderHelp";
import ArcGISMap, { PlanInfo } from "./ArcGISMap";

type FormFields = Omit<
  CreatePlanData,
  "ward" | "lcda" | "lga" | "geometry" | "pillars"
>;

export default function CreateSurfBoardPlan() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [pillars, setPillars] = useState<PillarData[]>([]);
  const [geometry, setGeometry] = useState<string>("");
  const [ward, setWard] = useState("");
  const [lcda, setLcda] = useState("");
  const [lga, setLga] = useState("");

  // Form state
  const [planInfo, setPlanInfo] = useState<FormFields>({
    planNumber: "",
    surveyTitle: "",
    planType: "",
    referencePlanNumber: "",
    deededArea: "",
    facilitator: "",
    pillarType: "",
    certificateReady: false,
  });

  // File state
  const [files, setFiles] = useState({
    csvFile: null as File | null,
    pdfFile: null as File | null,
    cadFile: null as File | null,
    certificateFile: null as File | null,
  });

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPlanInfo((prev: FormFields) => ({ ...prev, [name]: value }));
  };

  // Handle file uploads
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: keyof typeof files
  ) => {
    const file = e.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [fileType]: file }));
  };

  // Handle CSV upload and parsing
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const loadingToast = toast.loading("Processing CSV file...");

    try {
      const text = await file.text();
      const parsedPillars = parseCSVContent(text);
      setPillars(parsedPillars);
      setFiles((prev) => ({ ...prev, csvFile: file }));

      // Generate polygon geometry asynchronously
      if (parsedPillars.length >= 3) {
        try {
          const polygonGeometry = await generatePolygonFromPillars(parsedPillars);
          setGeometry(polygonGeometry);
          setShowMap(true);

          // Simulate getting administrative data (in real app, this would come from a GIS service)
          setWard("Sample Ward");
          setLcda("Sample LCDA");
          setLga("Sample LGA");

          toast.success(`Successfully parsed ${parsedPillars.length} pillars`, { id: loadingToast });
        } catch (error) {
          console.error("Error generating polygon:", error);
          toast.error(
            `Failed to process coordinates: ${error instanceof Error ? error.message : "Unknown error"}`,
            { id: loadingToast }
          );
          return;
        }
      } else {
        toast.error("Need at least 3 pillars to form a polygon", { id: loadingToast });
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error(
        `Error parsing CSV: ${error instanceof Error ? error.message : "Unknown error"}`,
        { id: loadingToast }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (pillars.length < 3) {
      toast.error("Please upload a CSV file with at least 3 pillars");
      return;
    }

    if (
      !planInfo.planNumber ||
      !planInfo.surveyTitle ||
      !planInfo.planType ||
      !planInfo.deededArea ||
      !planInfo.facilitator ||
      !planInfo.pillarType 
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Creating survey plan...");

    try {
      // Parse geometry and validate it
      let parsedGeometry;
      try {
        parsedGeometry = JSON.parse(geometry);
      } catch (error) {
        console.error("Error parsing geometry:", error);
        toast.error("Invalid geometry data. Please try uploading the CSV again.");
        return;
      }

      // Prepare plan data with proper types
      const planData: CreatePlanData = {
        ...planInfo,
        ward: ward || undefined,
        lcda: lcda || undefined,
        lga: lga || undefined,
        geometry: parsedGeometry,
        pillars: pillars,
        // status and isLive will use their defaults from Prisma
      };

      // Prepare file data
      const fileData: FileUploadData = {
        pdfFile: files.pdfFile || undefined,
        cadFile: files.cadFile || undefined,
        certificateFile: files.certificateFile || undefined,
      };

      // Call the server action to create the plan
      const result = await createSurfboardPlan(planData, fileData);

      if (result.success) {
        toast.success("Plan created successfully!", { id: loadingToast });
        // Redirect to the plan list after a short delay
        setTimeout(() => {
          router.push("/surfboard/dashboard/allplans");
          router.refresh(); // Ensure the list is up to date
        }, 1000);
      } else {
        toast.error(result.error || "Failed to create plan", {
          id: loadingToast,
        });
        console.error("Plan creation failed:", result.error);
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage, { id: loadingToast });

      // Log detailed error for debugging
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setPlanInfo({
      planNumber: "",
      surveyTitle: "",
      planType: "",
      referencePlanNumber: "",
      deededArea: "",
      facilitator: "",
      pillarType: "",
      certificateReady: false,
    });
    setFiles({
      csvFile: null,
      pdfFile: null,
      cadFile: null,
      certificateFile: null,
    });
    setPillars([]);
    setGeometry("");
    setWard("");
    setLcda("");
    setLga("");
    setShowMap(false);
  };

  return (
    <div className="max-w-[100rem] mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New Survey Plan
        </h1>
        <p className="text-gray-600">
          Upload survey data and create a new plan in the system
        </p>
      </div>

      {/* CSV Header Help */}
      <SurfboardCSVHeaderHelp />

      <div className="grid grid-cols-1 xl:grid-cols-[6fr_4fr] gap-8">
        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Plan Information
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Number *
                </label>
                <input
                  type="text"
                  name="planNumber"
                  value={planInfo.planNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Survey Title *
                </label>
                <input
                  type="text"
                  name="surveyTitle"
                  value={planInfo.surveyTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Type *
                </label>
                <select
                  name="planType"
                  value={planInfo.planType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Plan Type --</option>
                  <option value="APPROVED LAYOUT">APPROVED LAYOUT</option>
                  <option value="DEED">DEED</option>
                  <option value="DEED CHANGE OF TITLE">
                    DEED CHANGE OF TITLE
                  </option>
                  <option value="DEED CHANGE OF TITLE(LAYOUT)">
                    DEED CHANGE OF TITLE(LAYOUT)
                  </option>
                  <option value="PROVISIONAL">PROVISIONAL</option>
                  <option value="PROVISIONAL LAYOUT">PROVISIONAL LAYOUT</option>
                  <option value="WITHDRAWAL AND RE-SUBMISSION">
                    WITHDRAWAL AND RE-SUBMISSION
                  </option>
                </select>
              </div>

              {(planInfo.planType === "DEED CHANGE OF TITLE" ||
                planInfo.planType === "DEED CHANGE OF TITLE(LAYOUT)" ||
                planInfo.planType === "WITHDRAWAL AND RE-SUBMISSION") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Plan Number
                  </label>
                  <input
                    type="text"
                    name="referencePlanNumber"
                    value={planInfo.referencePlanNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deeded Area *
                </label>
                <input
                  type="text"
                  name="deededArea"
                  value={planInfo.deededArea}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facilitator *
                </label>
                <input
                  type="text"
                  name="facilitator"
                  value={planInfo.facilitator}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pillar Type *
                </label>
                <select
                  name="pillarType"
                  value={planInfo.pillarType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Pillar Type --</option>
                  <option value="REGULAR">REGULAR</option>
                  <option value="SPECIAL">SPECIAL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Ready?
                </label>
                <select
                  name="certificateReady"
                  value={planInfo.certificateReady ? "yes" : "no"}
                  onChange={(e) => {
                    const value = e.target.value === "yes";
                    setPlanInfo((prev) => ({
                      ...prev,
                      certificateReady: value,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            {/* File Uploads */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">
                File Uploads
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pillars CSV File *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: PillarNumber,Easting,Northing
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, "pdfFile")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CAD File
                  </label>
                  <input
                    type="file"
                    accept=".dwg,.dxf"
                    onChange={(e) => handleFileChange(e, "cadFile")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {planInfo.certificateReady && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate File
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, "certificateFile")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Administrative Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">
                Administrative Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WARD
                  </label>
                  <input
                    type="text"
                    value={ward}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LCDA
                  </label>
                  <input
                    type="text"
                    value={lcda}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LGA
                  </label>
                  <input
                    type="text"
                    value={lga}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={isLoading || pillars.length < 3}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pillars must be greater than 3"
              >
                {isLoading ? "Creating Plan..." : "Create Plan"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Map Preview Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Map Preview
          </h2>

          {showMap && pillars.length > 0 ? (
            <div className="space-y-8">
              {/* Leaflet Map Preview */}
              <div>
                <h3 className="font-medium text-blue-700 mb-2">Leaflet Map</h3>
                <MapPreview pillars={pillars} geometry={geometry} />
              </div>

              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">
                  Pillar Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Pillars:</span>
                    <span className="ml-2 font-medium">{pillars.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Area:</span>
                    <span className="ml-2 font-medium">
                      Calculated from geometry
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">
                  Preview Pillars
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  {pillars.slice(0, 10).map((pillar, index) => (
                    <div key={index} className="text-sm text-blue-700 py-1">
                      {pillar.pillarNumber}: ({pillar.easting.toFixed(2)},{" "}
                      {pillar.northing.toFixed(2)})
                    </div>
                  ))}
                  {pillars.length > 10 && (
                    <div className="text-sm text-blue-600 italic">
                      ... and {pillars.length - 10} more pillars
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">
                  Geometry Generated
                </h3>
                <p className="text-sm text-green-700">
                  Polygon geometry has been successfully generated from{" "}
                  {pillars.length} pillars.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
                  />
                </svg>
              </div>
              <p className="text-gray-600">
                Upload a CSV file with pillar coordinates to see the map preview
              </p>
              <p className="text-sm text-gray-500 mt-2">
                The map will show the generated polygon and pillar locations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ArcGIS Map Preview */}
      {/* <div>
        <h3 className="font-medium text-green-700 mb-2">ArcGIS Map</h3>
        <ArcGISMapPreview pillars={pillars} geometry={geometry} />
      </div> */}

      <ArcGISMap
        pillars={pillars} // directly pass PillarData[]
        planInfo={planInfo}
        zoomPadding={{
          duration: 1000, // animation duration in milliseconds
          zoom: 10, // zoom level
        }}
        onSubmit={(data) => console.log(data)}
      />
    </div>
  );
}
