"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, AlertCircle } from "lucide-react";
import AllPlans from "./AllPlans";
import QueriedPlans from "./QueriedPlans";
import { surfboardApi } from "@/surfboard/apiClient";

// "Shared Plans" was retired as a separate tab — "Shared Access" is now a
// filter inside All Plans (Shared with me / My Shared Plans), per the
// Shared Access vision: filters, not tabs.
const VALID_TABS = ["all", "queried"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function PlansPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "all";

  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);
  const [queriedCount, setQueriedCount] = useState<number>(0);
  const [queriedPlans, setQueriedPlans] = useState<any[] | null>(null);

  const fetchQueriedData = async () => {
    try {
      const result = await surfboardApi.plans.queried();
      if (result.success && result.data) {
        setQueriedCount(result.data.length);
        setQueriedPlans(result.data);
      }
    } catch (error) {
      console.error("Error fetching queried data:", error);
    }
  };

  useEffect(() => {
    fetchQueriedData();
  }, []);

  const handleTabChange = (value: string) => {
    if (VALID_TABS.includes(value as TabValue)) {
      setActiveTab(value as TabValue);
    }
  };

  return (
    <div className="w-full">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="mb-6">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">All Plans</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="queried" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Queried Plans</span>
              <span className="sm:hidden">Queried</span>
              {queriedCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                  {queriedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          <AllPlans />
        </TabsContent>

        <TabsContent value="queried" className="mt-0">
          <QueriedPlans
            initialPlans={queriedPlans}
            onPlansChange={fetchQueriedData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
