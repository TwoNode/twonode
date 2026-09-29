"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, UserX, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { surfboardApi } from "@/surfboard/apiClient";
import {type User } from "./SinglePlan"

interface SharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  sharedWith: User[];
  onShareUpdate: (users: User[]) => void;
}

export function SharePlanModal({
  isOpen,
  onClose,
  planId,
  sharedWith = [],
  onShareUpdate,
}: SharePlanModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<User[]>(sharedWith);
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();
  const isEmailQuery = /\S+@\S+\.\S+/.test(searchQuery.trim());

  // Update shared users when prop changes
  useEffect(() => {
    setSharedUsers(sharedWith);
  }, [sharedWith]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await surfboardApi.users.search(query);
      if (!result.success) {
        throw new Error(result.error || 'Failed to search users');
      }
      
      // Transform the search results to match the User interface
      const users = result.data || [];
      
      // Filter out already shared users
      const filteredResults = users.filter(
        (user: User) => !sharedUsers.some(sharedUser => sharedUser.id === user.id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search for users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = async (user: User) => {
    try {
      const result = await surfboardApi.plans.share(planId, user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to share plan');
      }

      // Update local state
      const updatedSharedUsers = [...sharedUsers, user];
      setSharedUsers(updatedSharedUsers);
      onShareUpdate(updatedSharedUsers);
      setSearchResults(searchResults.filter(u => u.id !== user.id));

      toast({
        title: "Success",
        description: `Shared plan with ${user.firstName} ${user.lastName}`,
      });
    } catch (error) {
      console.error("Error sharing plan:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInviteByEmail = async () => {
    const email = searchQuery.trim();
    setIsInviting(true);
    try {
      const result = await surfboardApi.plans.inviteByEmail(planId, email);
      if (!result.success) {
        throw new Error(result.error || "Failed to invite by email");
      }

      if ("invited" in result.data) {
        toast({
          title: "Invitation sent",
          description: `${email} doesn't have an account yet — we emailed them an invite. They'll see this plan as soon as they sign up.`,
        });
      } else {
        toast({ title: "Success", description: `Shared plan with ${email}` });
      }
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error inviting by email:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite by email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const result = await surfboardApi.plans.unshare(planId, userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove user access');
      }

      // Update local state
      const updatedSharedUsers = sharedUsers.filter(user => user.id !== userId);
      setSharedUsers(updatedSharedUsers);
      onShareUpdate(updatedSharedUsers);

      const removedUser = sharedUsers.find(user => user.id === userId);
      if (removedUser) {
        toast({
          title: "Access Removed",
          description: `Removed ${removedUser.firstName} ${removedUser.lastName}'s access to this plan`,
        });
      }
    } catch (error) {
      console.error("Error removing user access:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove user access. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Share Plan</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
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
            />
          </div>

          {searchQuery && (
            <div className="mb-6 rounded-md border">
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
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                              {user.surconRegNumber && ` • ${user.surconRegNumber}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddUser(user)}
                          className="h-8"
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
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
                      <p className="text-sm font-medium">{searchQuery.trim()}</p>
                      <p className="text-xs text-muted-foreground">No account yet — invite by email</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInviteByEmail}
                    disabled={isInviting}
                    className="h-8"
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    {isInviting ? "Inviting..." : "Invite"}
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
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                            {user.surconRegNumber && ` • ${user.surconRegNumber}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
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
                This plan is not shared with anyone yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
