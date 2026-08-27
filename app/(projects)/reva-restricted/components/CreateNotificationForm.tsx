"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Send, Loader2 } from "lucide-react";
import { createNotification } from "../../reva/actions/revaActions";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import { toast } from "sonner";

type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "SYSTEM"
  | "PAYMENT"
  | "PROPERTY";

type NotificationAudience =
  | "SPECIFIC_USERS"
  | "GENERAL_USERS"
  | "GENERAL_ADMINS"
  | "SUPERADMIN"
  | "ALL_USERS";

const typeOptions = [
  { value: "INFO", label: "Info", color: "text-blue-500" },
  { value: "SUCCESS", label: "Success", color: "text-green-500" },
  { value: "WARNING", label: "Warning", color: "text-yellow-500" },
  { value: "ERROR", label: "Error", color: "text-red-500" },
  { value: "SYSTEM", label: "System", color: "text-gray-500" },
  { value: "PAYMENT", label: "Payment", color: "text-indigo-500" },
  { value: "PROPERTY", label: "Property", color: "text-purple-500" },
];

const audienceOptions = [
  { value: "SPECIFIC_USERS", label: "Specific Users" },
  { value: "GENERAL_USERS", label: "General Users" },
  { value: "GENERAL_ADMINS", label: "General Admins" },
  { value: "SUPERADMIN", label: "Superadmin" },
  { value: "ALL_USERS", label: "All Users" },
];

export default function CreateNotificationForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "INFO" as NotificationType,
    title: "",
    message: "",
    audience: "GENERAL_USERS" as NotificationAudience,
    link: "",
    specificUserIds: "",
    includeLink: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const notificationData = {
        type: formData.type,
        title: formData.title.trim(),
        message: formData.message.trim(),
        audience: formData.audience,
        link:
          formData.includeLink && formData.link.trim()
            ? formData.link.trim()
            : undefined,
        userIds:
          formData.audience === "SPECIFIC_USERS" &&
          formData.specificUserIds.trim()
            ? formData.specificUserIds
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
            : undefined,
      };

      const result = await createNotification(notificationData);

      if (result.success) {
        toast.success("Notification created successfully!");
        // Reset form
        setFormData({
          type: "INFO",
          title: "",
          message: "",
          audience: "GENERAL_USERS",
          link: "",
          specificUserIds: "",
          includeLink: false,
        });
      } else {
        toast.error(result.message || "Failed to create notification");
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      toast.error("An error occurred while creating the notification");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div
            className="p-2 rounded-full"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            <Bell className="w-4 h-4 text-white" />
          </div>
          Create New Notification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notification Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Notification Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                handleInputChange("type", value as NotificationType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience *</Label>
            <Select
              value={formData.audience}
              onValueChange={(value) =>
                handleInputChange("audience", value as NotificationAudience)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                {audienceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specific User IDs */}
          {formData.audience === "SPECIFIC_USERS" && (
            <div className="space-y-2">
              <Label htmlFor="specificUserIds">
                User IDs (comma-separated) *
              </Label>
              <Input
                id="specificUserIds"
                placeholder="user1, user2, user3"
                value={formData.specificUserIds}
                onChange={(e) =>
                  handleInputChange("specificUserIds", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Enter user IDs separated by commas
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter notification title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Enter notification message"
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.message.length}/500 characters
            </p>
          </div>

          {/* Include Link */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeLink"
              checked={formData.includeLink}
              onCheckedChange={(checked) =>
                handleInputChange("includeLink", checked as boolean)
              }
            />
            <Label htmlFor="includeLink">Include a link</Label>
          </div>

          {/* Link */}
          {formData.includeLink && (
            <div className="space-y-2">
              <Label htmlFor="link">Link URL</Label>
              <Input
                id="link"
                placeholder="https://example.com"
                value={formData.link}
                onChange={(e) => handleInputChange("link", e.target.value)}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Create Notification
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
