"use client";

import { useState, useEffect } from "react";
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
import {
    Archive,
    CheckCircle,
    Clock,
    History,
    Loader2,
    FolderCheck,
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
    lga: string | null;
    ward: string | null;
    lcda: string | null;
    deededArea: string;
    redCopyFileUrl: string | null;
    user: {
        firstName: string;
        lastName: string;
        companyName: string | null;
        surconNumber?: string | null;
    } | null;
    batch: {
        batchCode: string;
    } | null;
    archiveReceivedAt?: Date | null;
}

export default function ArchiveDashboard() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [historyPlans, setHistoryPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [archiveNotes, setArchiveNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const [pendingRes, historyRes] = await Promise.all([
                getPendingArchivePlans(),
                getArchiveHistory(),
            ]);

            if (pendingRes.success && pendingRes.data) {
                setPlans(pendingRes.data.plans);
            }
            if (historyRes.success && historyRes.data) {
                setHistoryPlans(historyRes.data.plans);
            }
        } catch (error) {
            console.error("Error fetching archive data:", error);
            toast.error("Failed to load archive data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleArchiveClick = (plan: Plan) => {
        setSelectedPlan(plan);
        setArchiveNotes("");
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedPlan) return;

        try {
            setProcessing(true);
            const result = await markPlanArchived(selectedPlan.id, archiveNotes);

            if (result.success) {
                toast.success(`Plan ${selectedPlan.planNumber} archived successfully`);
                setDialogOpen(false);
                fetchPlans(); // Refresh lists
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-slate-600 mx-auto" />
                    <p className="mt-4 text-slate-600">Loading plans...</p>
                </div>
            </div>
        );
    }

    const renderPlanCard = (plan: Plan, isHistory: boolean = false) => {
        return (
            <Card
                key={plan.id}
                className={`transition-all duration-200 border-l-4 ${isHistory ? "border-l-slate-400" : "border-l-blue-500 hover:shadow-md"
                    }`}
            >
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-xl text-slate-800">
                                    {plan.planNumber}
                                </CardTitle>
                                {isHistory && (
                                    <Badge className="bg-slate-100 text-slate-700">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Archived
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="mt-1">
                                {plan.surveyTitle}
                            </CardDescription>
                            {plan.batch && (
                                <div className="mt-2">
                                    <Badge variant="outline" className="text-slate-600">
                                        Batch: {plan.batch.batchCode}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                        <div>
                            <p className="text-xs text-slate-500">Surveyor</p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.user?.firstName} {plan.user?.lastName}
                            </p>
                            {plan.user?.surconNumber && (
                                <p className="text-xs text-slate-500">
                                    {plan.user.surconNumber}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Company</p>
                            <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                {plan.user?.companyName || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Location</p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.lga || "N/A"}{plan.ward ? `, Ward ${plan.ward}` : ""}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Deeded Area</p>
                            <p className="text-sm font-medium text-slate-900">
                                {plan.deededArea || "N/A"}
                            </p>
                        </div>
                    </div>

                    {!isHistory ? (
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => handleArchiveClick(plan)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <FolderCheck className="w-4 h-4 mr-2" />
                                Mark as Received & Archived
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-slate-900">
                                    Archived on {plan.archiveReceivedAt ? formatDate(plan.archiveReceivedAt) : "Unknown Date"}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Archive className="w-8 h-8 text-slate-600" />
                    Archive Dashboard
                </h1>
                <p className="mt-2 text-slate-600">
                    Acknowledge and archive physically submitted plans that have passed all MDA reviews.
                </p>
            </div>

            <Tabs defaultValue="pending" className="flex-1">
                <TabsList className="mb-6 bg-white border border-slate-200">
                    <TabsTrigger
                        value="pending"
                        className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        Pending Receipt
                        <Badge
                            variant="secondary"
                            className="ml-2 bg-slate-200 text-slate-700"
                        >
                            {plans.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="history"
                        className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
                    >
                        <History className="w-4 h-4 mr-2" />
                        Archived History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="m-0">
                    {plans.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <Archive className="w-12 h-12 mx-auto text-slate-300" />
                            <h3 className="mt-4 text-lg font-medium text-slate-900">
                                No Plans Pending
                            </h3>
                            <p className="mt-1 text-slate-500">
                                There are currently no fully approved plans waiting to be archived.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {plans.map((p) => renderPlanCard(p, false))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="m-0">
                    {historyPlans.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <History className="w-12 h-12 mx-auto text-slate-300" />
                            <h3 className="mt-4 text-lg font-medium text-slate-900">
                                No History Found
                            </h3>
                            <p className="mt-1 text-slate-500">
                                You haven't archived any plans yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {historyPlans.map((p) => renderPlanCard(p, true))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderCheck className="w-5 h-5 text-blue-600" />
                            Acknowledge Receipt & Archive
                        </DialogTitle>
                        <DialogDescription>
                            Confirm that you have securely received and archived the physical copies for plan{" "}
                            <strong className="text-slate-900">
                                {selectedPlan?.planNumber}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="archive-notes"
                                className="text-sm font-medium text-slate-700"
                            >
                                Archive Notes / Location (Optional)
                            </label>
                            <Textarea
                                id="archive-notes"
                                placeholder="e.g., Cabinet 4, Shelf B"
                                value={archiveNotes}
                                onChange={(e) => setArchiveNotes(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
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
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Archiving...
                                </>
                            ) : (
                                "Confirm & Archive"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
