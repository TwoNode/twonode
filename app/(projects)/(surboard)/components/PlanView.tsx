"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Eye,
  FileText,
  Calendar,
  List,
  Grid,
  MoreVertical,
  MapPin,
  Ruler,
  MapPinIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
  Plan,
  PillarData,
} from "@/app/(projects)/(surboard)/types/surfboardTypes";
import { JsonValue } from "@prisma/client/runtime/library";

const statusVariant = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "destructive",
  UNDER_REVIEW: "default",
} as const;

const statusLabels = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  UNDER_REVIEW: "Under Review",
} as const;

interface PlanViewProps {
  plans: Plan[];
  emptyMessage?: string;
  showViewToggle?: boolean;
  defaultView?: "list" | "grid";
}

// Helper function to format area in square meters to hectares
const formatArea = (areaSqM: number | string | null | undefined): string => {
  if (areaSqM === null || areaSqM === undefined) return "N/A";
  const area = typeof areaSqM === "string" ? parseFloat(areaSqM) : areaSqM;
  if (isNaN(area)) return "N/A";
  if (area < 10000) return `${area.toFixed(2)} m²`;
  return `${(area / 10000).toFixed(2)} ha`;
};

// Helper function to format coordinates
const formatCoordinates = (centroid: number[] | null | undefined): string => {
  if (!centroid || !Array.isArray(centroid) || centroid.length < 2)
    return "N/A";
  const [lng, lat] = centroid;
  return `${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;
};

export default function PlanView({
  plans,
  emptyMessage = "No plans found",
  showViewToggle = true,
  defaultView = "grid",
}: PlanViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">(defaultView);

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showViewToggle && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                viewMode === "grid"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                viewMode === "list"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold line-clamp-1">
                      {plan.surveyTitle || `Plan ${plan.planNumber}`}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {plan.planNumber}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2">
                  <Badge variant={statusVariant[plan.status]}>
                    {statusLabels[plan.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-3 text-sm">
                  {plan.facilitator && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="line-clamp-1">{plan.facilitator}</div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>Area: {formatArea(plan.areaSqM)}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="truncate">
                      {formatCoordinates(plan.centroid as number[])}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      Updated {format(new Date(plan.updatedAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/surfboard/dashboard/plan?planId=${plan.id}`)
                  }
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    onClick={() =>
                      router.push(`/surfboard/dashboard/plan?planId=${plan.id}`)
                    }
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {plan.planNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {plan.surveyTitle}
                      </div>
                      {plan.facilitator && (
                        <div className="text-sm text-gray-500">
                          {plan.facilitator}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatArea(plan.areaSqM)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span
                          className="truncate max-w-[150px]"
                          title={formatCoordinates(plan.centroid as number[])}
                        >
                          {formatCoordinates(plan.centroid as number[])}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={statusVariant[plan.status]}>
                        {statusLabels[plan.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(plan.updatedAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/surfboard/dashboard/plan?planId=${plan.id}`
                            );
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
