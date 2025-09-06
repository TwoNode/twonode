"use client";
import React from "react";
import SurfboardPlanForm from "@/app/(projects)/(surfboard)/components/SurfboardPlanForm";

export default function CreateSurfBoardPlan({ isSuperAdmin = false }) {
  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Create New Surfboard Plan</h1>
      <SurfboardPlanForm mode="create" isSuperAdmin={!!isSuperAdmin} />
    </div>
  );
}

// "use client";

// import React, { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { toast } from "sonner";
// import {
//   createSurfPlan,
//   getAllFacilitatorsAndPlanNumbers,
// } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
// import type {
//   CreatePlanData,
//   PillarData,
//   FileUploadData,
// } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
// import MapPreview from "./MapPreview";
// import {
//   generatePolygonFromPillars,
//   parseCSVContent,
// } from "../../../utils/surfboardUtils";
// import SurfboardCSVHeaderHelp from "@/components/SurfboardCSVHeaderHelp";
// import ArcGISMap from "./ArcGISMap";

// type FormFields = Omit<
//   CreatePlanData,
//   "ward" | "lcda" | "lga" | "geometry" | "pillars"
// >;

// export default function CreateSurfPlan() {
//   const router = useRouter();
//   const mapRef = useRef<HTMLDivElement>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showMap, setShowMap] = useState(false);
//   const [pillars, setPillars] = useState<PillarData[]>([]);
//   const [geometry, setGeometry] = useState<string>("");
//   const [ward, setWard] = useState("");
//   const [lcda, setLcda] = useState("");
//   const [lga, setLga] = useState("");

//   // Form state
//   const [planInfo, setPlanInfo] = useState<FormFields>({
//     planNumber: "",
//     surveyTitle: "",
//     planType: "",
//     referencePlanNumber: "",
//     deededArea: "",
//     facilitator: "",
//     pillarType: "",
//     certificateReady: false,
//     dateOnSurveyPlan: "",
//     reasonForWithdrawalAndResubmission: "",
//   });

//   // File state
//   const [files, setFiles] = useState({
//     csvFile: null as File | null,
//     pdfFile: null as File | null,
//     cadFile: null as File | null,
//     certificateFile: null as File | null,
//   });

//   const [facilitators, setFacilitators] = useState<string[]>([]);
//   const [showNewFacilitatorInput, setShowNewFacilitatorInput] = useState(false);
//   const [showNewPlanNumberInput, setShowNewPlanNumberInput] = useState(false);
//   const [isLoadingData, setIsLoadingData] = useState(true);
//   const [dataError, setDataError] = useState<string | null>(null);

//   // State for plan numbers and search
//   const [allPlanNumbers, setAllPlanNumbers] = useState<string[]>([]);
//   const [filteredPlanNumbers, setFilteredPlanNumbers] = useState<string[]>([]);
//   const [showPlanNumberDropdown, setShowPlanNumberDropdown] = useState(false);

//   // Load both facilitators and plan numbers in a single effect
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         setIsLoadingData(true);
//         setDataError(null);

//         const result = await getAllFacilitatorsAndPlanNumbers();

//         if (result?.success && result.data) {
//           setFacilitators(result.data.facilitators);
//           setAllPlanNumbers(result.data.planNumbers);
//           setFilteredPlanNumbers(result.data.planNumbers);
//         } else {
//           setDataError(result?.error || "Failed to load data");
//           toast.error(result?.error || "Failed to load data");
//         }
//       } catch (error) {
//         console.error("Error loading data:", error);
//         setDataError("An error occurred while loading data");
//         toast.error("An error occurred while loading data");
//       } finally {
//         setIsLoadingData(false);
//       }
//     };

//     loadData();
//   }, []);

//   // Handle form input changes
//   const handleInputChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;
//     setPlanInfo((prev: FormFields) => ({ ...prev, [name]: value }));
//   };

//   // Handle file uploads
//   const handleFileChange = (
//     e: React.ChangeEvent<HTMLInputElement>,
//     fileType: keyof typeof files
//   ) => {
//     const file = e.target.files?.[0] || null;
//     setFiles((prev) => ({ ...prev, [fileType]: file }));
//   };

//   // Handle CSV upload and parsing
//   const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setIsLoading(true);
//     const loadingToast = toast.loading("Processing CSV file...");

//     try {
//       const text = await file.text();
//       const parsedPillars = parseCSVContent(text);
//       setPillars(parsedPillars);
//       setFiles((prev) => ({ ...prev, csvFile: file }));

//       // Generate polygon geometry asynchronously
//       if (parsedPillars.length >= 3) {
//         try {
//           const polygonGeometry = await generatePolygonFromPillars(
//             parsedPillars
//           );
//           setGeometry(polygonGeometry);
//           setShowMap(true);

//           // Simulate getting administrative data (in real app, this would come from a GIS service)
//           setWard("Sample Ward");
//           setLcda("Sample LCDA");
//           setLga("Sample LGA");

//           toast.success(`Successfully parsed ${parsedPillars.length} pillars`, {
//             id: loadingToast,
//           });
//         } catch (error) {
//           console.error("Error generating polygon:", error);
//           toast.error(
//             `Failed to process coordinates: ${
//               error instanceof Error ? error.message : "Unknown error"
//             }`,
//             { id: loadingToast }
//           );
//           return;
//         }
//       } else {
//         toast.error("Need at least 3 pillars to form a polygon", {
//           id: loadingToast,
//         });
//       }
//     } catch (error) {
//       console.error("Error parsing CSV:", error);
//       toast.error(
//         `Error parsing CSV: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`,
//         { id: loadingToast }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handle plan number search
//   const handlePlanNumberSearch = (searchTerm: string) => {
//     if (!searchTerm.trim()) {
//       setFilteredPlanNumbers(allPlanNumbers);
//       return;
//     }
//     const filtered = allPlanNumbers.filter((planNumber) =>
//       planNumber.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//     setFilteredPlanNumbers(filtered);
//   };

//   // Handle plan number selection
//   const handlePlanNumberSelect = (planNumber: string) => {
//     setPlanInfo((prev) => ({ ...prev, planNumber }));
//     setShowPlanNumberDropdown(false);
//   };

//   // Handle form submission
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     // Basic validation
//     if (pillars.length < 3) {
//       toast.error("Please upload a CSV file with at least 3 pillars");
//       return;
//     }

//     if (
//       !planInfo.planNumber ||
//       !planInfo.surveyTitle ||
//       !planInfo.planType ||
//       !planInfo.deededArea ||
//       !planInfo.facilitator ||
//       !planInfo.pillarType ||
//       (planInfo.planType === "WITHDRAWAL AND RE-SUBMISSION" &&
//         !planInfo.reasonForWithdrawalAndResubmission)
//     ) {
//       toast.error("Please fill in all required fields");
//       return;
//     }

//     setIsLoading(true);
//     const loadingToast = toast.loading("Creating survey plan...");

//     try {
//       // Parse geometry and validate it
//       let parsedGeometry;
//       try {
//         parsedGeometry = JSON.parse(geometry);
//       } catch (error) {
//         console.error("Error parsing geometry:", error);
//         toast.error(
//           "Invalid geometry data. Please try uploading the CSV again."
//         );
//         return;
//       }

//       // Prepare plan data with proper types
//       const planData: CreatePlanData = {
//         ...planInfo,
//         ward: ward || undefined,
//         lcda: lcda || undefined,
//         lga: lga || undefined,
//         geometry: parsedGeometry,
//         pillars: pillars,
//         // status and isLive will use their defaults from Prisma
//       };

//       // Prepare file data
//       const fileData: FileUploadData = {
//         pdfFile: files.pdfFile || undefined,
//         cadFile: files.cadFile || undefined,
//         certificateFile: files.certificateFile || undefined,
//       };

//       // Call the server action to create the plan
//       const result = await createSurfPlan(planData, fileData);

//       if (result.success) {
//         toast.success("Plan created successfully!", { id: loadingToast });
//         // Redirect to the plan list after a short delay
//         setTimeout(() => {
//           router.push("/surfboard/dashboard/plans");
//           router.refresh(); // Ensure the list is up to date
//         }, 1000);
//       } else {
//         toast.error(result.error || "Failed to create plan", {
//           id: loadingToast,
//         });
//         console.error("Plan creation failed:", result.error);
//       }
//     } catch (error) {
//       console.error("Error creating plan:", error);
//       const errorMessage =
//         error instanceof Error ? error.message : "An unknown error occurred";
//       toast.error(errorMessage, { id: loadingToast });

//       // Log detailed error for debugging
//       if (error instanceof Error) {
//         console.error("Error details:", {
//           message: error.message,
//           stack: error.stack,
//           name: error.name,
//         });
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Reset form
//   const handleReset = () => {
//     setPlanInfo({
//       planNumber: "",
//       surveyTitle: "",
//       planType: "",
//       referencePlanNumber: "",
//       deededArea: "",
//       facilitator: "",
//       pillarType: "",
//       certificateReady: false,
//       dateOnSurveyPlan: "",
//       reasonForWithdrawalAndResubmission: "",
//     });
//     setFiles({
//       csvFile: null,
//       pdfFile: null,
//       cadFile: null,
//       certificateFile: null,
//     });
//     setPillars([]);
//     setGeometry("");
//     setWard("");
//     setLcda("");
//     setLga("");
//     setShowMap(false);
//   };

//   return (
//     <div className="max-w-[100rem] mx-auto py-8 px-4">
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">
//           Create New Survey Plan
//         </h1>
//         <p className="text-gray-600">
//           Upload survey data and create a new plan in the system
//         </p>
//       </div>

//       {/* CSV Header Help */}
//       <SurfboardCSVHeaderHelp />

//       <div className="grid grid-cols-1 xl:grid-cols-[6fr_4fr] gap-8">
//         {/* Form Section */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h2 className="text-xl font-semibold mb-6 text-gray-800">
//             Plan Information
//           </h2>

//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Basic Information */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Plan Number *
//                 </label>
//                 {isLoadingData ? (
//                   <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
//                 ) : dataError ? (
//                   <div className="flex items-center gap-2">
//                     <span className="text-red-600 text-sm">{dataError}</span>
//                     <button
//                       type="button"
//                       onClick={async () => {
//                         try {
//                           setIsLoadingData(true);
//                           setDataError(null);
//                           const result =
//                             await getAllFacilitatorsAndPlanNumbers();
//                           if (result?.success && result.data) {
//                             setFacilitators(result.data.facilitators);
//                             setAllPlanNumbers(result.data.planNumbers);
//                             setFilteredPlanNumbers(result.data.planNumbers);
//                           } else {
//                             setDataError(
//                               result?.error || "Failed to load data"
//                             );
//                             toast.error(result?.error || "Failed to load data");
//                           }
//                         } catch (error) {
//                           console.error("Error reloading data:", error);
//                           setDataError("Failed to reload. Please try again.");
//                           toast.error("Failed to reload. Please try again.");
//                         } finally {
//                           setIsLoadingData(false);
//                         }
//                       }}
//                       className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
//                       disabled={isLoadingData}
//                     >
//                       {isLoadingData ? "Loading..." : "Retry"}
//                     </button>
//                   </div>
//                 ) : planInfo.planType === "WITHDRAWAL AND RE-SUBMISSION" ? (
//                   <div className="flex gap-2">
//                     <select
//                       name="planNumber"
//                       value={planInfo.planNumber}
//                       onChange={(e) => {
//                         setPlanInfo((prev) => ({
//                           ...prev,
//                           planNumber: e.target.value,
//                         }));
//                       }}
//                       className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                       disabled={isLoadingData}
//                     >
//                       <option value="">-- Select Plan Number --</option>
//                       {filteredPlanNumbers.map((planNumber) => (
//                         <option key={planNumber} value={planNumber}>
//                           {planNumber}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 ) : !showNewPlanNumberInput ? (
//                   <div className="flex gap-2">
//                     <select
//                       name="planNumber"
//                       value={planInfo.planNumber}
//                       onChange={(e) => {
//                         if (e.target.value === "new") {
//                           setShowNewPlanNumberInput(true);
//                           setPlanInfo((prev) => ({ ...prev, planNumber: "" }));
//                         } else {
//                           setPlanInfo((prev) => ({
//                             ...prev,
//                             planNumber: e.target.value,
//                           }));
//                         }
//                       }}
//                       className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                       disabled={isLoadingData}
//                     >
//                       <option value="">-- Select Plan Number --</option>
//                       {filteredPlanNumbers.map((planNumber) => (
//                         <option key={planNumber} value={planNumber}>
//                           {planNumber}
//                         </option>
//                       ))}
//                       <option value="new">+ Add New Plan Number</option>
//                     </select>
//                   </div>
//                 ) : (
//                   <div className="flex gap-2">
//                     <input
//                       type="text"
//                       name="planNumber"
//                       value={planInfo.planNumber}
//                       onChange={handleInputChange}
//                       className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       placeholder="Enter new plan number"
//                       required
//                       autoFocus
//                     />
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setShowNewPlanNumberInput(false);
//                         setPlanInfo((prev) => ({ ...prev, planNumber: "" }));
//                       }}
//                       className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 )}
//                 {planInfo.planNumber &&
//                   allPlanNumbers.some(
//                     (p) => p.toLowerCase() === planInfo.planNumber.toLowerCase()
//                   ) && (
//                     <p className="mt-1 text-sm text-yellow-600">
//                       Note: This plan number already exists in the system.
//                     </p>
//                   )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Survey Title *
//                 </label>
//                 <input
//                   type="text"
//                   name="surveyTitle"
//                   value={planInfo.surveyTitle}
//                   onChange={handleInputChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Plan Type *
//                 </label>
//                 <select
//                   name="planType"
//                   value={planInfo.planType}
//                   onChange={handleInputChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">-- Select Plan Type --</option>
//                   <option value="APPROVED LAYOUT">APPROVED LAYOUT</option>
//                   <option value="DEED">DEED</option>
//                   <option value="DEED CHANGE OF TITLE">
//                     DEED CHANGE OF TITLE
//                   </option>
//                   <option value="DEED CHANGE OF TITLE(LAYOUT)">
//                     DEED CHANGE OF TITLE(LAYOUT)
//                   </option>
//                   <option value="PROVISIONAL">PROVISIONAL</option>
//                   <option value="PROVISIONAL LAYOUT">PROVISIONAL LAYOUT</option>
//                   <option value="WITHDRAWAL AND RE-SUBMISSION">
//                     WITHDRAWAL AND RE-SUBMISSION
//                   </option>
//                 </select>
//               </div>

//               {(planInfo.planType === "DEED CHANGE OF TITLE" ||
//                 planInfo.planType === "DEED CHANGE OF TITLE(LAYOUT)" ||
//                 planInfo.planType === "WITHDRAWAL AND RE-SUBMISSION") && (
//                 <div className="relative">
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Reference Plan Number
//                   </label>
//                   <div className="relative">
//                     <input
//                       type="text"
//                       name="referencePlanNumber"
//                       value={planInfo.referencePlanNumber}
//                       onChange={(e) => {
//                         handleInputChange(e);
//                         handlePlanNumberSearch(e.target.value);
//                         setShowPlanNumberDropdown(true);
//                       }}
//                       onFocus={() => setShowPlanNumberDropdown(true)}
//                       onBlur={() =>
//                         setTimeout(() => setShowPlanNumberDropdown(false), 200)
//                       }
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     {isLoadingData && (
//                       <div className="absolute inset-y-0 right-0 flex items-center pr-3">
//                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
//                       </div>
//                     )}
//                   </div>

//                   {/* Dropdown for plan numbers */}
//                   {showPlanNumberDropdown && filteredPlanNumbers.length > 0 && (
//                     <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
//                       <ul className="py-1">
//                         {filteredPlanNumbers.map((planNumber) => (
//                           <li
//                             key={planNumber}
//                             className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
//                             onMouseDown={() =>
//                               handlePlanNumberSelect(planNumber)
//                             }
//                           >
//                             {planNumber}
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   )}
//                 </div>
//               )}

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Deeded Area *
//                 </label>
//                 <input
//                   type="text"
//                   name="deededArea"
//                   value={planInfo.deededArea}
//                   onChange={handleInputChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Facilitator *
//                 </label>
//                 {isLoadingData ? (
//                   <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
//                 ) : dataError ? (
//                   <div className="flex items-center gap-2">
//                     <span className="text-red-600 text-sm">{dataError}</span>
//                     <button
//                       type="button"
//                       onClick={async () => {
//                         try {
//                           setIsLoadingData(true);
//                           setDataError(null);
//                           const result =
//                             await getAllFacilitatorsAndPlanNumbers();
//                           if (result?.success && result.data) {
//                             setFacilitators(result.data.facilitators);
//                             setAllPlanNumbers(result.data.planNumbers);
//                             setFilteredPlanNumbers(result.data.planNumbers);
//                           } else {
//                             setDataError(
//                               result?.error || "Failed to load data"
//                             );
//                             toast.error(result?.error || "Failed to load data");
//                           }
//                         } catch (error) {
//                           console.error("Error reloading data:", error);
//                           setDataError("Failed to reload. Please try again.");
//                           toast.error("Failed to reload. Please try again.");
//                         } finally {
//                           setIsLoadingData(false);
//                         }
//                       }}
//                       className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
//                       disabled={isLoadingData}
//                     >
//                       {isLoadingData ? "Loading..." : "Retry"}
//                     </button>
//                   </div>
//                 ) : !showNewFacilitatorInput ? (
//                   <div className="flex gap-2">
//                     <select
//                       name="facilitator"
//                       value={planInfo.facilitator}
//                       onChange={(e) => {
//                         if (e.target.value === "new") {
//                           setShowNewFacilitatorInput(true);
//                           setPlanInfo((prev) => ({ ...prev, facilitator: "" }));
//                         } else {
//                           setPlanInfo((prev) => ({
//                             ...prev,
//                             facilitator: e.target.value,
//                           }));
//                         }
//                       }}
//                       className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                       disabled={isLoadingData}
//                     >
//                       <option value="">-- Select Facilitator --</option>
//                       {facilitators.map((facilitator) => (
//                         <option key={facilitator} value={facilitator}>
//                           {facilitator}
//                         </option>
//                       ))}
//                       <option value="new">+ Add New Facilitator</option>
//                     </select>
//                   </div>
//                 ) : (
//                   <div className="flex gap-2">
//                     <input
//                       type="text"
//                       name="facilitator"
//                       value={planInfo.facilitator}
//                       onChange={handleInputChange}
//                       className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       placeholder="Enter new facilitator name"
//                       required
//                       autoFocus
//                     />
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setShowNewFacilitatorInput(false);
//                         setPlanInfo((prev) => ({ ...prev, facilitator: "" }));
//                       }}
//                       className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 )}
//                 {planInfo.facilitator &&
//                   facilitators.some(
//                     (f) =>
//                       f.toLowerCase() === planInfo.facilitator.toLowerCase()
//                   ) && (
//                     <p className="mt-1 text-sm text-yellow-600">
//                       Note: This facilitator already exists in the system.
//                     </p>
//                   )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Pillar Type *
//                 </label>
//                 <select
//                   name="pillarType"
//                   value={planInfo.pillarType}
//                   onChange={handleInputChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">-- Select Pillar Type --</option>
//                   <option value="REGULAR">REGULAR</option>
//                   <option value="SPECIAL">SPECIAL</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Certificate Ready?
//                 </label>
//                 <select
//                   name="certificateReady"
//                   value={planInfo.certificateReady ? "yes" : "no"}
//                   onChange={(e) => {
//                     const value = e.target.value === "yes";
//                     setPlanInfo((prev) => ({
//                       ...prev,
//                       certificateReady: value,
//                     }));
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="no">No</option>
//                   <option value="yes">Yes</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Date on Survey Plan
//                 </label>
//                 <input
//                   type="date"
//                   name="dateOnSurveyPlan"
//                   value={planInfo.dateOnSurveyPlan as string}
//                   onChange={handleInputChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               {planInfo.planType === "WITHDRAWAL AND RE-SUBMISSION" && (
//                 <div className="col-span-2">
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Reason for Withdrawal and Resubmission *
//                   </label>
//                   <textarea
//                     name="reasonForWithdrawalAndResubmission"
//                     value={planInfo.reasonForWithdrawalAndResubmission}
//                     onChange={(e) =>
//                       setPlanInfo((prev) => ({
//                         ...prev,
//                         reasonForWithdrawalAndResubmission: e.target.value,
//                       }))
//                     }
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
//                     required={
//                       planInfo.planType === "WITHDRAWAL AND RE-SUBMISSION"
//                     }
//                   />
//                 </div>
//               )}
//             </div>

//             {/* File Uploads */}
//             <div className="space-y-4">
//               <h3 className="text-lg font-medium text-gray-800">
//                 File Uploads
//               </h3>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Pillars CSV File *
//                   </label>
//                   <input
//                     type="file"
//                     accept=".csv"
//                     onChange={handleCsvUpload}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                   <p className="text-xs text-gray-500 mt-1">
//                     Format: PillarNumber,Easting,Northing
//                   </p>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     PDF File
//                   </label>
//                   <input
//                     type="file"
//                     accept=".pdf"
//                     onChange={(e) => handleFileChange(e, "pdfFile")}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     CAD File
//                   </label>
//                   <input
//                     type="file"
//                     accept=".dwg,.dxf"
//                     onChange={(e) => handleFileChange(e, "cadFile")}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 {planInfo.certificateReady && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Certificate File
//                     </label>
//                     <input
//                       type="file"
//                       accept=".pdf,.jpg,.jpeg,.png"
//                       onChange={(e) => handleFileChange(e, "certificateFile")}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Administrative Information */}
//             <div className="space-y-4">
//               <h3 className="text-lg font-medium text-gray-800">
//                 Administrative Information
//               </h3>

//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     WARD
//                   </label>
//                   <input
//                     type="text"
//                     value={ward}
//                     readOnly
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     LCDA
//                   </label>
//                   <input
//                     type="text"
//                     value={lcda}
//                     readOnly
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     LGA
//                   </label>
//                   <input
//                     type="text"
//                     value={lga}
//                     readOnly
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Action Buttons */}
//             <div className="flex gap-4 pt-6">
//               <button
//                 type="submit"
//                 disabled={isLoading || pillars.length < 3}
//                 className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                 title="Pillars must be greater than 3"
//               >
//                 {isLoading ? "Creating Plan..." : "Create Plan"}
//               </button>

//               <button
//                 type="button"
//                 onClick={handleReset}
//                 className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
//               >
//                 Reset
//               </button>
//             </div>
//           </form>
//         </div>

//         {/* Map Preview Section */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h2 className="text-xl font-semibold mb-6 text-gray-800">
//             Map Preview
//           </h2>

//           {showMap && pillars.length > 0 ? (
//             <div className="space-y-8">
//               {/* Leaflet Map Preview */}
//               <div>
//                 <h3 className="font-medium text-blue-700 mb-2">Leaflet Map</h3>
//                 <MapPreview pillars={pillars} geometry={geometry} />
//               </div>

//               <div className="bg-gray-100 rounded-lg p-4">
//                 <h3 className="font-medium text-gray-800 mb-2">
//                   Pillar Summary
//                 </h3>
//                 <div className="grid grid-cols-2 gap-4 text-sm">
//                   <div>
//                     <span className="text-gray-600">Total Pillars:</span>
//                     <span className="ml-2 font-medium">{pillars.length}</span>
//                   </div>
//                   <div>
//                     <span className="text-gray-600">Area:</span>
//                     <span className="ml-2 font-medium">
//                       Calculated from geometry
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                 <h3 className="font-medium text-blue-800 mb-2">
//                   Preview Pillars
//                 </h3>
//                 <div className="max-h-40 overflow-y-auto">
//                   {pillars.slice(0, 10).map((pillar, index) => (
//                     <div key={index} className="text-sm text-blue-700 py-1">
//                       {pillar.pillarNumber}: ({pillar.easting.toFixed(2)},{" "}
//                       {pillar.northing.toFixed(2)})
//                     </div>
//                   ))}
//                   {pillars.length > 10 && (
//                     <div className="text-sm text-blue-600 italic">
//                       ... and {pillars.length - 10} more pillars
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="bg-green-50 border border-green-200 rounded-lg p-4">
//                 <h3 className="font-medium text-green-800 mb-2">
//                   Geometry Generated
//                 </h3>
//                 <p className="text-sm text-green-700">
//                   Polygon geometry has been successfully generated from{" "}
//                   {pillars.length} pillars.
//                 </p>
//               </div>
//             </div>
//           ) : (
//             <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
//               <div className="text-gray-400 mb-4">
//                 <svg
//                   className="mx-auto h-12 w-12"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"
//                   />
//                 </svg>
//               </div>
//               <p className="text-gray-600">
//                 Upload a CSV file with pillar coordinates to see the map preview
//               </p>
//               <p className="text-sm text-gray-500 mt-2">
//                 The map will show the generated polygon and pillar locations
//               </p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ArcGIS Map Preview */}
//       {/* <div>
//         <h3 className="font-medium text-green-700 mb-2">ArcGIS Map</h3>
//         <ArcGISMapPreview pillars={pillars} geometry={geometry} />
//       </div> */}

//       <ArcGISMap
//         pillars={pillars} // directly pass PillarData[]
//         planInfo={planInfo}
//         zoomPadding={{
//           duration: 1000, // animation duration in milliseconds
//           zoom: 10, // zoom level
//         }}
//         onSubmit={(data) => console.log(data)}
//       />
//     </div>
//   );
// }
