"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  FileType2,
  FileCheck2,
  MapPin,
  Edit,
  Trash2,
  Layers,
  RefreshCw,
  File,
} from "lucide-react";
import MaplibreMap from "./maps/MaplibreMap";

interface OptimizedSinglePlanDetailsProps {
  planData: any; // The pre-loaded plan data
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

interface FileCardProps {
  filePath: string;
  type: "pdf" | "cad" | "cert";
  showDelete?: boolean;
}

const FileCard: React.FC<FileCardProps> = ({
  filePath,
  type,
  showDelete = false,
}) => {
  const getFileIcon = () => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500 mr-2" />;
      case "cad":
        return <FileType2 className="h-5 w-5 text-blue-500 mr-2" />;
      case "cert":
        return <FileCheck2 className="h-5 w-5 text-green-500 mr-2" />;
      default:
        return <File className="h-5 w-5 text-gray-500 mr-2" />;
    }
  };

  const fileName = filePath.split("/").pop() || "";
  const isDwg = fileName.toLowerCase().endsWith(".dwg");

  return (
    <div className="border rounded-md p-3 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0">
          {getFileIcon()}
          <span className="text-sm truncate" title={fileName}>
            {fileName}
          </span>
        </div>
      </div>

      <div className="mt-2 space-x-2">
        {type === "pdf" || type === "cert" ? (
          <a
            href={filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {type === "pdf" ? "View PDF" : "View Certificate"}
          </a>
        ) : (
          <>
            <a
              href={filePath}
              download
              className="text-sm text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
            {!isDwg && (
              <a
                href={filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default function OptimizedSinglePlanDetails({
  planData,
  onEdit,
  onDelete,
  onRefresh,
}: OptimizedSinglePlanDetailsProps) {
  const [showMap, setShowMap] = useState(false);

  const toggleMap = () => setShowMap(!showMap);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/surfboard/dashboard/plan?planId=${planData.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LODGED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "QUERIED":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!planData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">No plan data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        {/* Header Card with Gradient Background */}
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Plan Info */}
              <div className="space-y-2">
                <div className="inline-block bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-2 shadow-sm">
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Survey Plan
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {planData.planNumber}
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl">
                  {planData.surveyTitle}
                </p>

                {/* Plan Type Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {planData.planType}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    {planData.pillarType}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      planData.status
                    )}`}
                  >
                    {planData.status?.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-end">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span>Refresh</span>
                  </button>
                )}

                <button
                  onClick={toggleMap}
                  className="px-4 py-2 bg-white border border-blue-100 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{showMap ? "Hide Map" : "View Map"}</span>
                </button>

                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    <span>Edit</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      {!showMap && planData && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Map Preview
          </h2>

          <div
            className={`h-160 w-full rounded overflow-auto ${
              planData?.pillars?.length > 0
                ? "border-4 border-blue-400"
                : "border"
            }`}
          >
            <MaplibreMap processedPillars={planData?.pillars} />
          </div>
        </div>
      )}

      {/* Plan Details */}
      <div className="space-y-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Plan Information Card */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg
                  className="w-5 h-5 text-blue-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Plan Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Plan Number
                  </p>
                  <p className="mt-1 text-gray-900 font-medium">
                    {planData.planNumber}
                  </p>
                  {planData.referencePlanNumber && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-500">
                        Reference Number
                      </p>
                      <p className="mt-1 text-gray-700">
                        {planData.referencePlanNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Survey Title
                  </p>
                  <p className="mt-1 text-gray-700">{planData.surveyTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Plan Type
                    </p>
                    <p className="mt-1 text-gray-700">{planData.planType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Pillar Type
                    </p>
                    <p className="mt-1 text-gray-700">{planData.pillarType}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Facilitator
                  </p>
                  <p className="mt-1 text-gray-700">
                    {planData.facilitator || "N/A"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Date on Plan
                    </p>
                    <p className="mt-1 text-gray-700">
                      {planData.dateOnSurveyPlan
                        ? new Date(
                            planData.dateOnSurveyPlan
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Date Lodged
                    </p>
                    <p className="mt-1 text-gray-700">
                      {planData.dateLodged
                        ? new Date(planData.dateLodged).toLocaleDateString()
                        : "Not lodged"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Details Card */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="bg-linear-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Location Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                {planData.ward && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ward</p>
                    <p className="mt-1 text-gray-700">{planData.ward}</p>
                  </div>
                )}
                {planData.lcda && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">LCDA</p>
                    <p className="mt-1 text-gray-700">{planData.lcda}</p>
                  </div>
                )}
                {planData.lga && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">LGA</p>
                    <p className="mt-1 text-gray-700">{planData.lga}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Area</p>
                    <p className="mt-1 text-gray-700">
                      {planData.areaSqM
                        ? planData.areaSqM < 10000
                          ? `${planData.areaSqM.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })} m²`
                          : `${(planData.areaSqM / 10000).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 }
                            )} ha`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Deeded Area
                    </p>
                    <p className="mt-1 text-gray-700">
                      {planData.deededArea || "N/A"}
                    </p>
                  </div>
                </div>
                {planData.centroid &&
                  Array.isArray(planData.centroid) &&
                  planData.centroid.length >= 2 && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-500">
                        Centroid Coordinates
                      </p>
                      <p className="mt-1 text-gray-700 font-mono text-sm">
                        {`${planData.centroid[1].toFixed(
                          6
                        )}°N, ${planData.centroid[0].toFixed(6)}°E`}
                      </p>
                      <button
                        onClick={() => {
                          if (!planData?.centroid) return;
                          const [lng, lat] = planData.centroid;
                          window.open(
                            `https://www.google.com/maps?q=${lat},${lng}`,
                            "_blank"
                          );
                        }}
                        className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        View on Map
                        <svg
                          className="w-4 h-4 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Timestamps Card */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="bg-linear-to-r from-purple-50 to-violet-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg
                  className="w-5 h-5 text-purple-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Timestamps
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Created</p>
                    <p className="text-sm text-gray-700">
                      {new Date(planData.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Last Updated
                    </p>
                    <p className="text-sm text-gray-700">
                      {new Date(planData.updatedAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Pillars Count
                  </p>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {planData?.pillars?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Files Section */}
      {(planData.pdfFilePaths?.length > 0 ||
        planData.cadFilePaths?.length > 0 ||
        planData.certificateFilePaths?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm mb-6">
          <div className="bg-linear-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Uploaded Files
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {planData.pdfFilePaths?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  PDF Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planData.pdfFilePaths.map((path: string, idx: number) => (
                    <FileCard key={idx} filePath={path} type="pdf" />
                  ))}
                </div>
              </div>
            )}

            {planData.cadFilePaths?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  CAD Files
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planData.cadFilePaths.map((path: string, idx: number) => (
                    <FileCard key={idx} filePath={path} type="cad" />
                  ))}
                </div>
              </div>
            )}

            {planData.certificateFilePaths?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Certificates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planData.certificateFilePaths.map(
                    (path: string, idx: number) => (
                      <FileCard key={idx} filePath={path} type="cert" />
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
