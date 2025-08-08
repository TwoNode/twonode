"use client";

import React, { useEffect, useState } from "react";
import PlanList from "./SharedPlanList";
import { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
import { getAllSharedSurfPlans, getSharedWithMeSurfPlans } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Share2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SharedPlans() {
  const [search, setSearch] = useState("");
  const [sharedPlans, setSharedPlans] = useState<Plan[]>([]);
  const [sharedWithMePlans, setSharedWithMePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("shared");

  useEffect(() => {
    const fetchSharedPlans = async () => {
      try {
        setLoading(true);
        const [sharedResult, sharedWithMeResult] = await Promise.all([
          getAllSharedSurfPlans(),
          getSharedWithMeSurfPlans()
        ]);

        if (sharedResult.success) {
          setSharedPlans(sharedResult.data || []);
        } else {
          throw new Error(sharedResult.error || "Failed to fetch shared plans");
        }

        if (sharedWithMeResult.success) {
          setSharedWithMePlans(sharedWithMeResult.data || []);
        } else {
          console.error("Failed to fetch shared with me plans:", sharedWithMeResult.error);
        }
      } catch (err) {
        console.error("Error fetching shared plans:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSharedPlans();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Shared Plans</h1>
            <p className="text-muted-foreground">Manage your shared survey plans</p>
          </div>
          
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 border rounded-lg animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading shared plans</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Shared Plans</h1>
            <p className="text-muted-foreground">
              {activeTab === 'shared' 
                ? 'Plans you have shared with others' 
                : 'Plans shared with you'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search plans..."
                className="pl-10 w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-10 gap-1">
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
            </Button>
            <Button size="sm" className="h-10 gap-1">
              <Share2 className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Share Plan</span>
            </Button>
          </div>
        </div>

        <Tabs 
          defaultValue="shared" 
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="shared">My Shared</TabsTrigger>
            <TabsTrigger value="sharedWithMe">Shared with Me</TabsTrigger>
          </TabsList>
          <TabsContent value="shared" className="mt-6">
            {sharedPlans.length > 0 ? (
              <PlanList 
                plans={sharedPlans.filter(plan => 
                  plan.surveyTitle?.toLowerCase().includes(search.toLowerCase()) ||
                  plan.planNumber?.toLowerCase().includes(search.toLowerCase())
                )} 
                emptyMessage="You haven't shared any plans yet."
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No shared plans</h3>
                <p className="text-muted-foreground mb-4">Get started by sharing a plan with your team</p>
                <Button>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Plan
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="sharedWithMe" className="mt-6">
            {sharedWithMePlans.length > 0 ? (
              <PlanList 
                plans={sharedWithMePlans.filter(plan => 
                  plan.surveyTitle?.toLowerCase().includes(search.toLowerCase()) ||
                  plan.planNumber?.toLowerCase().includes(search.toLowerCase())
                )} 
                emptyMessage="No plans have been shared with you yet."
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No plans shared with you</h3>
                <p className="text-muted-foreground">When someone shares a plan with you, it will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
