"use client";

import { useState } from "react";
import { X, Search, UserPlus, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { surfboardApi } from "@/surfboard/apiClient";

interface SearchUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  surconRegNumber: string | null;
}

interface BulkSharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: { id: string; planNumber: string }[];
}

/**
 * Shares several plans with one user/email in one action, instead of
 * repeating the single-plan Share dialog once per plan. Deliberately does
 * NOT show a per-plan "shared with" list (too much to usefully render for
 * N plans at once) — it's a pure add-access action with a results summary,
 * same underlying share/invite calls as SharePlanModal, just looped.
 */
export function BulkSharePlanModal({ isOpen, onClose, plans }: BulkSharePlanModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const isEmailQuery = /\S+@\S+\.\S+/.test(searchQuery.trim());

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const result = await surfboardApi.users.search(query);
      if (!result.success) throw new Error(result.error || "Failed to search users");
      setSearchResults(result.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search for users.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const shareWithAllPlans = async (share: (planId: string) => Promise<{ success: boolean; error?: string }>) => {
    setIsSharing(true);
    let succeeded = 0;
    const failed: string[] = [];
    try {
      for (const plan of plans) {
        try {
          const result = await share(plan.id);
          if (!result.success) throw new Error(result.error || "Failed");
          succeeded++;
        } catch {
          failed.push(plan.planNumber);
        }
      }
      if (succeeded > 0) {
        toast({
          title: "Success",
          description: `Shared ${succeeded} of ${plans.length} plan${plans.length === 1 ? "" : "s"}${failed.length ? ` — failed: ${failed.join(", ")}` : ""}`,
        });
      }
      if (succeeded === 0 && failed.length > 0) {
        toast({ title: "Error", description: "Failed to share any of the selected plans.", variant: "destructive" });
      }
      if (failed.length === 0) {
        setSearchQuery("");
        setSearchResults([]);
        onClose();
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleAddUser = (user: SearchUser) =>
    shareWithAllPlans((planId) => surfboardApi.plans.share(planId, user.id));

  const handleInviteByEmail = () => {
    const email = searchQuery.trim();
    return shareWithAllPlans((planId) => surfboardApi.plans.inviteByEmail(planId, email));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Share {plans.length} plan{plans.length === 1 ? "" : "s"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plans.map((p) => p.planNumber).join(", ")}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users by name, email, or SURCON number..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                handleSearch(query);
              }}
              disabled={isSharing}
            />
          </div>

          {searchQuery && (
            <div className="rounded-md border">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ScrollArea className="h-40">
                  <div className="divide-y">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                              {user.surconRegNumber && ` • ${user.surconRegNumber}`}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleAddUser(user)} disabled={isSharing} className="h-8">
                          {isSharing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1 h-3.5 w-3.5" />}
                          Share
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : isEmailQuery ? (
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Mail className="h-3.5 w-3.5" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{searchQuery.trim()}</p>
                      <p className="text-xs text-muted-foreground">No account yet — invite by email</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleInviteByEmail} disabled={isSharing} className="h-8">
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    {isSharing ? "Sharing..." : "Invite"}
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">No users found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
