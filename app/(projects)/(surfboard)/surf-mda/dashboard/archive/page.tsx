"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
    Archive,
    CheckCircle,
    Clock,
    History,
    Loader2,
    FolderCheck,
    Search,
    FileText,
    ExternalLink,
    User,
    Hash,
    Briefcase,
    Mail,
    Phone,
    Package,
    StickyNote,
    Image as ImageIcon,
} from "lucide-react";
import {
    getPendingArchivePlans,
    getArchiveHistory,
    markPlanArchived,
} from "../../../actions/codActions";

interface Plan {
    id: string;
    planNumber: string;
    surveyTitle: string;
    planType?: string;
    lga: string | null;
    ward: string | null;
    lcda: string | null;
    locality?: string | null;
    deededArea: string;
    chartingRemarks?: string | null;
    redCopyFileUrl: string | null;
    recordsIIApprovedAt?: Date | null;
    recordsIIApprovedByUser?: {
        firstName: string;
        lastName: string;
    } | null;
    user: {
        firstName: string;
        lastName: string;
        companyName: string | null;
        surconRegNumber?: string | null;
        email?: string | null;
        phoneNumber?: string | null;
    } | null;
    batch: {
        batchCode: string;
    } | null;
    archiveReceivedAt?: Date | null;
    archiveReceivedBy?: string | null;
    archiveNotes?: string | null;
}

export default function ArchiveDashboard() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [historyPlans, setHistoryPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [archiveNotes, setArchiveNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    // Image viewer
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // Filter plans based on search query
    const filteredPlans = useMemo(() => {
        if (!searchQuery.trim()) return plans;
        const query = searchQuery.toLowerCase();
        return plans.filter((p) => {
            const matchesPlan =
                p.planNumber.toLowerCase().includes(query) ||
                p.surveyTitle.toLowerCase().includes(query) ||
                p.lga?.toLowerCase().includes(query) ||
                p.ward?.toLowerCase().includes(query);
            const matchesUser =
                p.user &&
                (`${p.user.firstName} ${p.user.lastName}`
                    .toLowerCase()
                    .includes(query) ||
                    p.user.surconRegNumber?.toLowerCase().includes(query) ||
                    p.user.companyName?.toLowerCase().includes(query));
            const matchesBatch = p.batch?.batchCode
                ?.toLowerCase()
                .includes(query);
            return matchesPlan || matchesUser || matchesBatch;
        });
    }, [plans, searchQuery]);

    const filteredHistoryPlans = useMemo(() => {
        if (!searchQuery.trim()) return historyPlans;
        const query = searchQuery.toLowerCase();
        return historyPlans.filter((p) => {
            const matchesPlan =
                p.planNumber.toLowerCase().includes(query) ||
                p.surveyTitle.toLowerCase().includes(query) ||
                p.lga?.toLowerCase().includes(query);
            const matchesUser =
                p.user &&
                (`${p.user.firstName} ${p.user.lastName}`
                    .toLowerCase()
                    .includes(query) ||
                    p.user.surconRegNumber?.toLowerCase().includes(query) ||
                    p.user.companyName?.toLowerCase().includes(query));
            const matchesBatch = p.batch?.batchCode
                ?.toLowerCase()
                .includes(query);
            return matchesPlan || matchesUser || matchesBatch;
        });
    }, [historyPlans, searchQuery]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const pendingRes = await getPendingArchivePlans();
            if (pendingRes.success && pendingRes.data) {
                setPlans(pendingRes.data.plans);
            }
        } catch (error) {
            console.error("Error fetching archive data:", error);
            toast.error("Failed to load archive data");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const historyRes = await getArchiveHistory();
            if (historyRes.success && historyRes.data) {
                setHistoryPlans(historyRes.data.plans);
            }
        } catch (error) {
            console.error("Error fetching archive history:", error);
            toast.error("Failed to load archive history");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        if (activeTab === "history" && historyPlans.length === 0) {
            fetchHistory();
        }
    }, [activeTab]);

    const handleArchiveClick = (plan: Plan) => {
        setSelectedPlan(plan);
        setArchiveNotes("");
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedPlan) return;

        try {
            setProcessing(true);
            const result = await markPlanArchived(
                selectedPlan.id,
                archiveNotes.trim() || undefined
            );

            if (result.success) {
                toast.success(
                    `Plan ${selectedPlan.planNumber} archived successfully`
                );
                setDialogOpen(false);
                fetchPlans();
                if (activeTab === "history") {
                    fetchHistory();
                }
            } else {
                toast.error(result.error || "Failed to archive plan");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const isImageUrl = (url: string): boolean => {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto" />
                    <p className="mt-4 text-gray-600">
                        Loading archive plans...
                    </p>
                </div>
            </div>
        );
    }

    const renderPlanCard = (plan: Plan, isHistory: boolean = false) => {
        return (
            <Card
                key={plan.id}
                className={`transition-all duration-200 ${
                    isHistory
                        ? "border-l-4 border-l-green-400"
                        : "border-l-4 border-l-amber-400 hover:shadow-md"
                }`}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-xl text-slate-800">
                                    {plan.planNumber}
                                </CardTitle>
                                {plan.planType && (
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {plan.planType}
                                    </Badge>
                                )}
                                {isHistory && (
                                    <Badge className="bg-green-100 text-green-700">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Archived
                                    </Badge>
                                )}
                                {!isHistory && (
                                    <Badge className="bg-amber-100 text-amber-700">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Awaiting Archive
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="mt-1">
                                {plan.surveyTitle}
                            </CardDescription>
                            {plan.batch && (
                                <div className="mt-2">
                                    <Badge
                                        variant="outline"
                                        className="text-slate-600"
                                    >
                                        <Package className="w-3 h-3 mr-1" />
                                        Batch: {plan.batch.batchCode}
                                    </Badge>
                                </div>
                            )}
                        </div>
                        {isHistory && plan.archiveReceivedAt && (
                            <div className="text-right text-xs text-gray-500">
                                <p>Archived on:</p>
                                <p className="font-medium text-gray-700">
                                    {formatDate(plan.archiveReceivedAt)}
                                </p>
                            </div>
                        )}
                        {!isHistory && plan.recordsIIApprovedAt && (
                            <div className="text-right text-xs text-gray-500">
                                <p>Records II Approved:</p>
                                <p className="font-medium text-gray-700">
                                    {formatDate(plan.recordsIIApprovedAt)}
                                </p>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Surveyor Information */}
                    {plan.user && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <User className="w-5 h-5 text-emerald-600" />
                                <h4 className="text-sm font-semibold text-emerald-800">
                                    Surveyor Information
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-emerald-600">
                                            Surveyor
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {plan.user.firstName}{" "}
                                            {plan.user.lastName}
                                        </p>
                                    </div>
                                </div>
                                {plan.user.surconRegNumber && (
                                    <div className="flex items-start gap-3">
                                        <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-emerald-600">
                                                SURCON Number
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {plan.user.surconRegNumber}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {plan.user.companyName && (
                                    <div className="flex items-start gap-3">
                                        <Briefcase className="w-4 h-4 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-emerald-600">
                                                Company
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {plan.user.companyName}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {plan.user.email && (
                                    <div className="flex items-start gap-3">
                                        <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-emerald-600">
                                                Email
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {plan.user.email}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {plan.user.phoneNumber && (
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-4 h-4 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-emerald-600">
                                                Phone
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {plan.user.phoneNumber}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Plan Location Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                        <div>
                            <p className="text-xs text-slate-500">LGA</p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.lga || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Ward</p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.ward || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">LCDA</p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.lcda || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">
                                Deeded Area
                            </p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.deededArea || "N/A"}
                            </p>
                        </div>
                    </div>

                    {/* Charting Remarks */}
                    {plan.chartingRemarks && (
                        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                            <p className="text-xs font-medium text-purple-800 mb-1">
                                Charting Remarks
                            </p>
                            <p className="text-xs text-purple-700">
                                {plan.chartingRemarks}
                            </p>
                        </div>
                    )}

                    {/* Record Copy Document */}
                    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-medium text-blue-800">
                                Record Copy
                            </p>
                        </div>
                        {plan.redCopyFileUrl ? (
                            <div className="space-y-2">
                                {isImageUrl(plan.redCopyFileUrl) && (
                                    <div
                                        className="cursor-pointer inline-block"
                                        onClick={() =>
                                            setViewingImage(plan.redCopyFileUrl)
                                        }
                                    >
                                        <img
                                            src={plan.redCopyFileUrl}
                                            alt={`Record Copy - ${plan.planNumber}`}
                                            className="max-h-32 rounded border shadow-sm hover:shadow-md transition-shadow"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            Click to view full size
                                        </p>
                                    </div>
                                )}
                                <a
                                    href={plan.redCopyFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded border text-blue-600 hover:bg-blue-50 transition-colors text-xs"
                                >
                                    {isImageUrl(plan.redCopyFileUrl) ? (
                                        <ImageIcon className="w-3.5 h-3.5" />
                                    ) : (
                                        <FileText className="w-3.5 h-3.5" />
                                    )}
                                    Open Record Copy
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ) : (
                            <p className="text-xs text-red-600">
                                No record copy uploaded
                            </p>
                        )}
                    </div>

                    {/* Records II approval info (for pending) */}
                    {!isHistory && plan.recordsIIApprovedByUser && (
                        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-sm">
                            <p className="text-indigo-700">
                                <span className="font-medium">
                                    Records II Approved by:
                                </span>{" "}
                                {plan.recordsIIApprovedByUser.firstName}{" "}
                                {plan.recordsIIApprovedByUser.lastName}
                            </p>
                        </div>
                    )}

                    {/* Archive Details (for history) */}
                    {isHistory && (
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-green-900">
                                    Archived on{" "}
                                    {plan.archiveReceivedAt
                                        ? formatDate(plan.archiveReceivedAt)
                                        : "Unknown Date"}
                                </p>
                                {plan.archiveNotes && (
                                    <div className="flex items-start gap-1.5 mt-1">
                                        <StickyNote className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-green-700">
                                            <span className="font-medium">
                                                Notes:
                                            </span>{" "}
                                            {plan.archiveNotes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Archive Action Button (for pending) */}
                    {!isHistory && (
                        <div className="flex justify-end pt-2 border-t border-gray-200">
                            <Button
                                onClick={() => handleArchiveClick(plan)}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <FolderCheck className="w-4 h-4 mr-2" />
                                Mark as Received & Archived
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <>
            <div className="container mx-auto p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <Archive className="w-8 h-8 text-amber-600" />
                        Archive Dashboard
                    </h1>
                    <p className="mt-2 text-slate-600">
                        Log the physical handover of plans from Records II to
                        the official archive. This is for internal tracking.
                    </p>
                </div>

                {/* Search Input */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by plan number, surveyor, batch code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as any)}
                >
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger
                            value="pending"
                            className="flex items-center gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            Pending Receipt ({filteredPlans.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="flex items-center gap-2"
                        >
                            <History className="w-4 h-4" />
                            Archived History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="mt-6">
                        {filteredPlans.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Archive className="w-16 h-16 text-gray-300 mb-4" />
                                    <p className="text-gray-500 text-lg">
                                        {searchQuery
                                            ? "No matching plans found"
                                            : "No Plans Pending"}
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        {searchQuery
                                            ? "Try adjusting your search"
                                            : "Plans fully approved by Records II will appear here for physical archiving."}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {filteredPlans.map((p) =>
                                    renderPlanCard(p, false)
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-6">
                        {historyLoading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                            </div>
                        ) : filteredHistoryPlans.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <History className="w-16 h-16 text-gray-300 mb-4" />
                                    <p className="text-gray-500 text-lg">
                                        {searchQuery
                                            ? "No matching plans found"
                                            : "No History Found"}
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        {searchQuery
                                            ? "Try adjusting your search"
                                            : "Archived plans will appear here."}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {filteredHistoryPlans.map((p) =>
                                    renderPlanCard(p, true)
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Archive Confirmation Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderCheck className="w-5 h-5 text-amber-600" />
                            Acknowledge Receipt & Archive
                        </DialogTitle>
                        <DialogDescription>
                            Confirm that you have securely received and archived
                            the physical copies for plan{" "}
                            <strong className="text-slate-900">
                                {selectedPlan?.planNumber}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Confirmation info */}
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <p className="text-sm text-amber-800">
                                By archiving, you confirm that:
                            </p>
                            <ul className="text-sm text-amber-700 list-disc list-inside mt-2 space-y-1">
                                <li>
                                    The physical plan has been received from
                                    Records II.
                                </li>
                                <li>
                                    The plan has been securely stored in the
                                    official archive.
                                </li>
                                <li>
                                    This action is for internal tracking and does
                                    not change the plan&apos;s status.
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="archive-notes"
                                className="text-sm font-medium text-slate-700"
                            >
                                Archive Notes / Location (Optional)
                            </label>
                            <Textarea
                                id="archive-notes"
                                placeholder="e.g., Cabinet 4, Shelf B, Row 3"
                                value={archiveNotes}
                                onChange={(e) =>
                                    setArchiveNotes(e.target.value)
                                }
                                rows={3}
                                className="resize-none"
                            />
                            <p className="text-xs text-gray-500">
                                Record the physical storage location for future
                                reference.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={processing}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Archiving...
                                </>
                            ) : (
                                <>
                                    <FolderCheck className="w-4 h-4 mr-2" />
                                    Confirm & Archive
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Viewer Dialog */}
            <Dialog
                open={!!viewingImage}
                onOpenChange={() => setViewingImage(null)}
            >
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Record Copy Preview</DialogTitle>
                    </DialogHeader>
                    {viewingImage && (
                        <div className="flex justify-center">
                            <img
                                src={viewingImage}
                                alt="Record Copy"
                                className="max-h-[70vh] rounded-lg"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
