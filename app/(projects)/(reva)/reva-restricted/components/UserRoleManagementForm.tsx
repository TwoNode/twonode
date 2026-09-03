"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { revaApi } from "@/reva/apiClient";

const formSchema = z.object({
  userId: z.string().min(1, { message: "Please select a user" }),
  action: z.enum(["make-admin", "remove-admin"], {
    message: "Please select an action",
  }),
  role: z.enum(["ADMIN", "SUPERADMIN"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  is_active: boolean;
}

interface UserRoleManagementFormProps {
  users: User[];
}

export default function UserRoleManagementForm({
  users,
}: UserRoleManagementFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      action: "make-admin",
      role: "ADMIN",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (data.action === "make-admin" && data.role) {
        const result = await revaApi.admin.users.promote(data.userId, data.role);
        if (result.success) {
          toast.success("User upgraded to admin successfully!");
          form.reset();
        } else {
          toast.error(result.error || "Failed to make user admin");
        }
      } else if (data.action === "remove-admin") {
        const result = await revaApi.admin.users.demote(data.userId);
        if (result.success) {
          toast.success("Admin privileges removed successfully!");
          form.reset();
        } else {
          toast.error(result.error || "Failed to remove admin privileges");
        }
      }
    } catch (error) {
      console.error("Error managing user role:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = users.find((user) => user.id === form.watch("userId"));
  const selectedAction = form.watch("action");

  // Filter users based on the selected action
  const availableUsers = users.filter((user) => {
    if (selectedAction === "make-admin") {
      return user.role === "USER" && user.is_active;
    } else if (selectedAction === "remove-admin") {
      return (
        (user.role === "ADMIN" || user.role === "SUPERADMIN") && user.is_active
      );
    }
    return false;
  });

  // if (fetchingUsers) {
  //   return (
  //     <Card className="w-full max-w-md mx-auto">
  //       <CardContent className="p-6">
  //         <div className="flex items-center justify-center">
  //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  //           <span className="ml-2">Loading users...</span>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          User Role Management
        </CardTitle>
        <CardDescription>
          Upgrade users to admin or remove admin privileges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("userId", ""); // Reset user selection when action changes
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="make-admin">
                        Make User Admin
                      </SelectItem>
                      <SelectItem value="remove-admin">
                        Remove Admin Privileges
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAction === "make-admin" && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select admin role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedUser && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Selected User:</strong> {selectedUser.firstName}{" "}
                  {selectedUser.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current Role:</strong> {selectedUser.role}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !form.watch("userId")}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Submit"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
