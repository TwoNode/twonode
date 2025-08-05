// app/(projects)/(surboard)/surfboard/dashboard/plan/SharePlanModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

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
  const { toast } = useToast();

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
      // TODO: Replace with actual API call to search users
      // const results = await searchUsers(query);
      // setSearchResults(results);

      // Mock data for now
      setTimeout(() => {
        setSearchResults(
          [
            { id: "1", name: "John Doe", email: "john@example.com" },
            { id: "2", name: "Jane Smith", email: "jane@example.com" },
          ].filter(
            (user) =>
              !sharedUsers.some((sharedUser) => sharedUser.id === user.id) &&
              (user.name.toLowerCase().includes(query.toLowerCase()) ||
                user.email.toLowerCase().includes(query.toLowerCase()))
          )
        );
        setIsSearching(false);
      }, 500);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search for users. Please try again.",
        variant: "destructive",
      });
      setIsSearching(false);
    }
  };

  const handleAddUser = (user: User) => {
    if (!sharedUsers.some((u) => u.id === user.id)) {
      const updatedSharedUsers = [...sharedUsers, user];
      setSharedUsers(updatedSharedUsers);
      onShareUpdate(updatedSharedUsers);
      setSearchResults(searchResults.filter((u) => u.id !== user.id));

      // TODO: Call API to update shared users in the backend
      // await sharePlanWithUser(planId, user.id);

      toast({
        title: "Success",
        description: `Shared plan with ${user.name}`,
      });
    }
  };

  const handleRemoveUser = (userId: string) => {
    const updatedSharedUsers = sharedUsers.filter((user) => user.id !== userId);
    setSharedUsers(updatedSharedUsers);
    onShareUpdate(updatedSharedUsers);

    // TODO: Call API to remove user's access in the backend
    // await unsharePlanWithUser(planId, userId);

    const removedUser = sharedUsers.find((user) => user.id === userId);
    if (removedUser) {
      toast({
        title: "Access Removed",
        description: `Removed ${removedUser.name}'s access to this plan`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
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
              placeholder="Search users by name or email..."
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
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
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
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
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
