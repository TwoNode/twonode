"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { editSurfboardPlan } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import FileUpload from "@/components/ui/file-upload";
import { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
import Link from "next/link";

export default function EditPlan({
  plan,
  isWithin24Hours = false,
}: {
  plan: Plan;
  isWithin24Hours: boolean;
}) {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit Survey Plan</h1>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>
            {!isWithin24Hours && (
              <span className="text-yellow-600">
                Note: Only the certificate file can be updated after 24 hours of
                plan creation.
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={editSurfboardPlan} className="space-y-6">
            <input type="hidden" name="id" value={plan.id} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan Number */}
              <div className="space-y-2">
                <Label htmlFor="planNumber">Plan Number</Label>
                <Input
                  id="planNumber"
                  name="planNumber"
                  defaultValue={plan.planNumber}
                  disabled={!isWithin24Hours}
                  required
                />
              </div>

              {/* Survey Title */}
              <div className="space-y-2">
                <Label htmlFor="surveyTitle">Survey Title</Label>
                <Input
                  id="surveyTitle"
                  name="surveyTitle"
                  defaultValue={plan.surveyTitle}
                  disabled={!isWithin24Hours}
                  required
                />
              </div>

              {/* Plan Type */}
              <div className="space-y-2">
                <Label htmlFor="planType">Plan Type</Label>
                <Input
                  id="planType"
                  name="planType"
                  defaultValue={plan.planType}
                  disabled={!isWithin24Hours}
                  required
                />
              </div>

              {/* Reference Plan Number */}
              <div className="space-y-2">
                <Label htmlFor="referencePlanNumber">
                  Reference Plan Number
                </Label>
                <Input
                  id="referencePlanNumber"
                  name="referencePlanNumber"
                  defaultValue={plan.referencePlanNumber || ""}
                  disabled={!isWithin24Hours}
                />
              </div>

              {/* Deeded Area */}
              <div className="space-y-2">
                <Label htmlFor="deededArea">Deeded Area</Label>
                <Input
                  id="deededArea"
                  name="deededArea"
                  defaultValue={plan.deededArea}
                  disabled={!isWithin24Hours}
                  required
                />
              </div>

              {/* Facilitator */}
              <div className="space-y-2">
                <Label htmlFor="facilitator">Facilitator</Label>
                <Input
                  id="facilitator"
                  name="facilitator"
                  defaultValue={plan.facilitator}
                  disabled={!isWithin24Hours}
                  required
                />
              </div>

              {/* Certificate File Upload - Always enabled */}
              <div className="space-y-2">
                <Label htmlFor="certificateFile">Certificate File</Label>
                <FileUpload
                  acceptedFileTypes=".pdf,.doc,.docx"
                  onFilesUploaded={(files: File[] | null) => {
                    if (files && files.length > 0) {
                      // Update the hidden input with the new file URL
                      const hiddenInput = document.querySelector(
                        'input[name="certificateFilePath"]'
                      ) as HTMLInputElement;
                      if (hiddenInput) {
                        hiddenInput.value = files[0].name;
                      }
                    }
                  }}
                />
                <input
                  type="hidden"
                  name="certificateFilePath"
                  value={plan.certificateFilePath || ""}
                />
                {plan.certificateFilePath && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Current file: {plan.certificateFilePath.split("/").pop()  }
                    </p>
                    <Link
                      href={plan.certificateFilePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View current file {plan.certificateFilePath}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => plan.certificateFilePath}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={false}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
