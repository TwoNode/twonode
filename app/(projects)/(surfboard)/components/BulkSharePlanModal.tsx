"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, UserX, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  /** Fired once at least one plan was shared or unshared —
   * lets the caller refresh its list so "Shared (N)" badges reflect
   * the new access immediately. */
  onShared?: (
    updatedPlanIds?: string[],
    addedUser?: SearchUser,
    removedUserId?: string
  ) => void;
  plans: {
    id: string;
    planNumber: string;
    sharedTo?: string[];
    sharedToUsers?: SearchUser[];
  }[];
}

export function BulkSharePlanModal({
  isOpen,
  onClose,
  onShared,
  plans,
}: BulkSharePlanModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SearchUser[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<SearchUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();
  const isEmailQuery = /\S+@\S+\.\S+/.test(searchQuery.trim());

  // Populate shared users whenever the modal opens or plans change
  useEffect(() => {
    if (!isOpen) return;

    const userMap = new Map<string, SearchUser>();
    for (const plan of plans) {
      if (plan.sharedToUsers) {
        for (const u of plan.sharedToUsers) {
          if (!userMap.has(u.id)) {
            userMap.set(u.id, u);
          }
        }
      }
    }
    setSharedUsers(Array.from(userMap.values()));

    // For single plan, also fetch fresh plan details to ensure sharedToUsers is 100% current
    if (plans.length === 1) {
      surfboardApi.plans.get(plans[0].id).then((res) => {
        if (res.success && res.data?.sharedToUsers) {
          setSharedUsers(res.data.sharedToUsers);
        }
      });
    }
  }, [isOpen, plans]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const result = await surfboardApi.users.search(query);
      if (!result.success)
        throw new Error(result.error || "Failed to search users");
      // Filter out users already in sharedUsers
      const filtered = (result.data || []).filter(
        (user: SearchUser) => !sharedUsers.some((su) => su.id === user.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to search for users.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const shareWithAllPlans = async (
    share: (
      planId: string
    ) => Promise<{ success: boolean; error?: string; data?: any }>
  ) => {
    setIsSharing(true);
    let succeeded = 0;
    const succeededIds: string[] = [];
    const failed: string[] = [];
    let lastData: any = null;
    try {
      for (const plan of plans) {
        try {
          const result = await share(plan.id);
          if (!result.success) throw new Error(result.error || "Failed");
          succeeded++;
          succeededIds.push(plan.id);
          if (result.data) lastData = result.data;
        } catch {
          failed.push(plan.planNumber);
        }
      }
      if (succeeded > 0) {
        toast({
          title: "Success",
          description: `Shared ${succeeded} of ${plans.length} plan${plans.length === 1 ? "" : "s"}${
            failed.length ? ` — failed: ${failed.join(", ")}` : ""
          }`,
        });
      }
      if (succeeded === 0 && failed.length > 0) {
        toast({
          title: "Error",
          description: "Failed to share any of the selected plans.",
          variant: "destructive",
        });
      }
      return { succeeded, planIds: succeededIds, lastData };
    } finally {
      setIsSharing(false);
    }
  };

  const handleAddUser = async (user: SearchUser) => {
    const { succeeded, planIds } = await shareWithAllPlans((planId) =>
      surfboardApi.plans.share(planId, user.id)
    );
    if (succeeded > 0) {
      setSharedUsers((prev) =>
        prev.some((u) => u.id === user.id) ? prev : [...prev, user]
      );
      setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
      setSearchQuery("");
      onShared?.(planIds, user);
    }
  };

  const handleInviteByEmail = async () => {
    const email = searchQuery.trim();
    const { succeeded, planIds, lastData } = await shareWithAllPlans((planId) =>
      surfboardApi.plans.inviteByEmail(planId, email)
    );
    if (succeeded > 0) {
      let addedUser: SearchUser | undefined = undefined;
      if (lastData && "sharedUser" in lastData && lastData.sharedUser) {
        addedUser = lastData.sharedUser as SearchUser;
        setSharedUsers((prev) =>
          prev.some((x) => x.id === addedUser!.id)
            ? prev
            : [...prev, addedUser!]
        );
      }
      setSearchQuery("");
      setSearchResults([]);
      onShared?.(planIds, addedUser);
    }
  };

  const handleConfirmRemoveUser = async () => {
    if (!pendingRemoval) return;
    const userId = pendingRemoval.id;
    setIsRemoving(true);
    let succeeded = 0;
    const unsharedPlanIds: string[] = [];
    try {
      for (const plan of plans) {
        try {
          const res = await surfboardApi.plans.unshare(plan.id, userId);
          if (res.success) {
            succeeded++;
            unsharedPlanIds.push(plan.id);
          }
        } catch (err) {
          console.error("Failed to unshare plan:", plan.id, err);
        }
      }
      if (succeeded > 0) {
        setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
        toast({
          title: "Access Removed",
          description: `Removed ${pendingRemoval.firstName} ${pendingRemoval.lastName}'s access from ${succeeded} plan${
            succeeded === 1 ? "" : "s"
          }.`,
        });
        onShared?.(unsharedPlanIds, undefined, userId);
      } else {
        toast({
          title: "Error",
          description: "Failed to remove user access. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsRemoving(false);
      setPendingRemoval(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white dark:bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">
                Share {plans.length} plan{plans.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {plans.map((p) => p.planNumber).join(", ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 shrink-0"
            >
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
              <div className="mb-4 rounded-md border">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <ScrollArea className="h-40">
                    <div className="divide-y">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 hover:bg-muted/50"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.firstName?.[0]}
                                {user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                                {user.surconRegNumber &&
                                  ` • ${user.surconRegNumber}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddUser(user)}
                            disabled={isSharing}
                            className="h-8"
                          >
                            {isSharing ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="mr-1 h-3.5 w-3.5" />
                            )}
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
                        <AvatarFallback>
                          <Mail className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {searchQuery.trim()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          No account yet — invite by email
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleInviteByEmail}
                      disabled={isSharing}
                      className="h-8"
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      {isSharing ? "Sharing..." : "Invite"}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium">Shared with</h3>
              {sharedUsers.length > 0 ? (
                <ScrollArea className="h-40 rounded-md border">
                  <div className="divide-y">
                    {sharedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.firstName?.[0]}
                              {user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                              {user.surconRegNumber &&
                                ` • ${user.surconRegNumber}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingRemoval(user)}
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                  {plans.length === 1
                    ? "This plan is not shared with anyone yet."
                    : "None of these plans are shared with anyone yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval && (
                <>
                  This will remove {pendingRemoval.firstName}{" "}
                  {pendingRemoval.lastName}'s access to{" "}
                  {plans.length === 1
                    ? "this plan"
                    : `these ${plans.length} plans`}
                  . They will no longer be able to view{" "}
                  {plans.length === 1 ? "it" : "them"}.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveUser}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isRemoving ? "Removing..." : "Withdraw access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
