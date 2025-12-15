"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, Share2, AlertCircle } from "lucide-react";
import AllPlans from "./AllPlans";
import SharedPlans from "../shared/SharedPlans";
import QueriedPlans from "./QueriedPlans";

const VALID_TABS = ["all", "shared", "queried"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function PlansPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "all";

  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

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
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">All Plans</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Shared Plans</span>
              <span className="sm:hidden">Shared</span>
            </TabsTrigger>
            <TabsTrigger
              value="queried"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Queried Plans</span>
              <span className="sm:hidden">Queried</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          <AllPlans />
        </TabsContent>

        <TabsContent value="shared" className="mt-0">
          <SharedPlans />
        </TabsContent>

        <TabsContent value="queried" className="mt-0">
          <QueriedPlans />
        </TabsContent>
      </Tabs>
    </div>
  );
}
