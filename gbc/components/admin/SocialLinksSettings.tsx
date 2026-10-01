"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { gbcApi } from "@/gbc/apiClient";
import { GBCSettingsData } from "@/gbc/utils/settings";
import {
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Save,
  Loader2,
} from "lucide-react";

interface SocialLinksSettingsProps {
  settings: GBCSettingsData | null;
  /** The edition these settings belong to; saves go to that edition's row. */
  edition?: string;
}

export function SocialLinksSettings({ settings, edition }: SocialLinksSettingsProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    twitter: settings?.contact.twitter || "",
    facebook: settings?.contact.facebook || "",
    instagram: settings?.contact.instagram || "",
    linkedin: settings?.contact.linkedin || "",
    youtube: settings?.contact.youtube || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update only the social links part of contact settings
      const updatedContact = {
        ...settings?.contact,
        ...formData,
      };

      const result = await gbcApi.settings.update({ contact: updatedContact }, edition);

      if (result.success) {
        toast({
          title: "Success",
          description: "Social links updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update social links",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const socialPlatforms = [
    {
      name: "twitter",
      label: "Twitter/X",
      icon: Twitter,
      placeholder: "https://twitter.com/yourhandle",
      color: "text-blue-500",
    },
    {
      name: "facebook",
      label: "Facebook",
      icon: Facebook,
      placeholder: "https://www.facebook.com/yourpage",
      color: "text-blue-600",
    },
    {
      name: "instagram",
      label: "Instagram",
      icon: Instagram,
      placeholder: "https://www.instagram.com/yourhandle",
      color: "text-pink-600",
    },
    {
      name: "linkedin",
      label: "LinkedIn",
      icon: Linkedin,
      placeholder: "https://www.linkedin.com/company/yourcompany",
      color: "text-blue-700",
    },
    {
      name: "youtube",
      label: "YouTube",
      icon: Youtube,
      placeholder: "https://www.youtube.com/yourchannel",
      color: "text-red-600",
    },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <div key={platform.name} className="space-y-2">
              <Label
                htmlFor={platform.name}
                className="flex items-center gap-2"
              >
                <Icon className={`h-4 w-4 ${platform.color}`} />
                {platform.label}
              </Label>
              <Input
                id={platform.name}
                type="url"
                value={formData[platform.name]}
                onChange={(e) => handleChange(platform.name, e.target.value)}
                placeholder={platform.placeholder}
                className="w-full"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
