"use client";
import SurfboardPlanForm from "@/app/(projects)/(surfboard)/components/SurfboardPlanForm";
import type { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

export default function EditPlan({
  plan,
  isSuperAdmin = false,
}: {
  plan: SurfboardPlanDTO;
  isSuperAdmin?: boolean;
}) {
  return (
    <>
      <div className="mx-auto p-4">
        {/* <h1 className="text-xl font-semibold mb-4">Edit Surfboard Plan</h1> */}

        <SurfboardPlanForm
          mode="edit"
          initial={plan}
          isSuperAdmin={!!isSuperAdmin}
        />
      </div>
    </>
  );
}

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { toast } from "sonner";
// import { editSurfboardPlan } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
// import { Plan } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// type FileType = 'pdf' | 'cad' | 'certificate';

// interface EditPlanProps {
//   plan: Plan & {
//     pdfFilePaths?: string[] | null;
//     cadFilePaths?: string[] | null;
//     certificateFilePaths?: string[] | null;
//   };
//   isWithin24Hours: boolean;
// }

// export default function EditPlan({ plan, isWithin24Hours }: EditPlanProps) {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(false);
//   const [files, setFiles] = useState<Record<FileType, File[]>>({
//     pdf: [],
//     cad: [],
//     certificate: [],
//   });

//   const handleFileChange = (type: FileType, fileList: FileList | null) => {
//     if (!fileList) return;
//     setFiles(prev => ({
//       ...prev,
//       [type]: [...prev[type], ...Array.from(fileList)]
//     }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     try {
//       const formData = new FormData();
//       formData.append('id', plan.id);

//       // Add files to form data
//       (Object.entries(files) as [FileType, File[]][]).forEach(([type, fileList]) => {
//         fileList.forEach(file => formData.append(`${type}Files`, file));
//       });

//       // Add existing file paths
//       const existingFiles = {
//         pdf: plan.pdfFilePaths || [],
//         cad: plan.cadFilePaths || [],
//         certificate: plan.certificateFilePaths || []
//       };

//       Object.entries(existingFiles).forEach(([type, paths]) => {
//         paths.forEach(path => formData.append(`existing${type.charAt(0).toUpperCase() + type.slice(1)}Files`, path));
//       });

//       const result = await editSurfboardPlan(formData);

//       if (result.success) {
//         toast.success("Plan updated successfully!");
//         router.push(`/surfboard/dashboard/plan?planId=${plan.id}`);
//         router.refresh();
//       } else {
//         throw new Error(result.error || "Failed to update plan");
//       }
//     } catch (error) {
//       console.error("Error updating plan:", error);
//       toast.error(error instanceof Error ? error.message : "Failed to update plan");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="container mx-auto py-6 space-y-6">
//       <Card>
//         <CardHeader>
//           <CardTitle>Edit Plan: {plan.planNumber}</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* PDF Files */}
//             <div className="space-y-2">
//               <Label>PDF Files</Label>
//               <Input
//                 type="file"
//                 accept=".pdf"
//                 multiple
//                 onChange={(e) => handleFileChange('pdf', e.target.files)}
//                 disabled={!isWithin24Hours}
//               />
//               {plan.pdfFilePaths?.map((file, i) => (
//                 <div key={i} className="text-sm text-gray-600">
//                   {file.split('/').pop()}
//                 </div>
//               ))}
//             </div>

//             {/* CAD Files */}
//             <div className="space-y-2">
//               <Label>CAD Files</Label>
//               <Input
//                 type="file"
//                 accept=".dwg,.dxf"
//                 multiple
//                 onChange={(e) => handleFileChange('cad', e.target.files)}
//                 disabled={!isWithin24Hours}
//               />
//               {plan.cadFilePaths?.map((file, i) => (
//                 <div key={i} className="text-sm text-gray-600">
//                   {file.split('/').pop()}
//                 </div>
//               ))}
//             </div>

//             {/* Certificate Files - Always editable */}
//             <div className="space-y-2">
//               <Label>Certificate Files</Label>
//               <Input
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 multiple
//                 onChange={(e) => handleFileChange('certificate', e.target.files)}
//               />
//               {plan.certificateFilePaths?.map((file, i) => (
//                 <div key={i} className="text-sm text-gray-600">
//                   {file.split('/').pop()}
//                 </div>
//               ))}
//             </div>

//             <div className="flex justify-end">
//               <Button type="submit" disabled={isLoading}>
//                 {isLoading ? "Saving..." : "Save Changes"}
//               </Button>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
