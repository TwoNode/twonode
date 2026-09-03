"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { gbcApi } from "@/gbc/apiClient";
import { Pencil, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sponsor } from "@/gbc/types/sponsor";

interface EditSponsorModalProps {
  sponsor: Sponsor;
}

export function EditSponsorModal({ sponsor }: EditSponsorModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(sponsor.logo);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      let logo = sponsor.logo;
      let newLogoS3Key: string | undefined;

      if (logoFile) {
        const uploadResult = await gbcApi.uploads.file("sponsor-logo", logoFile);
        if (!uploadResult.success || !uploadResult.data) {
          toast.error("Failed to upload new logo");
          setIsSubmitting(false);
          return;
        }
        logo = uploadResult.data.url;
        newLogoS3Key = uploadResult.data.key;
      }

      const result = await gbcApi.sponsors.update(
        sponsor.id,
        {
          name: formData.get("name") as string,
          logo,
          tier: formData.get("tier") as "HEADLINE" | "IMPACT" | "SUPPORTING",
          description: (formData.get("description") as string) || undefined,
          website: (formData.get("website") as string) || undefined,
          order: parseInt(formData.get("order") as string) || 0,
          visible: formData.get("visible") === "true",
        },
        newLogoS3Key
      );

      if (result.success) {
        toast.success("Sponsor updated successfully");
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update sponsor");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sponsor</DialogTitle>
          <DialogDescription>Update sponsor details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <Label htmlFor="logo">Logo</Label>
            <div className="mt-2">
              {logoPreview ? (
                <div className="relative w-full h-40 bg-gray-50 rounded-lg border-2 border-dashed flex items-center justify-center">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-32 max-w-full object-contain"
                  />
                  <label className="absolute top-2 right-2 bg-white text-gray-700 rounded-full p-2 shadow-sm cursor-pointer hover:bg-gray-100">
                    <Pencil className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Click to upload new logo
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 5MB
                  </span>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Sponsor Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={sponsor.name}
              placeholder="Company Name"
              disabled={isSubmitting}
            />
          </div>

          {/* Tier */}
          <div>
            <Label htmlFor="tier">Tier *</Label>
            <Select
              name="tier"
              required
              defaultValue={sponsor.tier}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HEADLINE">Headline Sponsor</SelectItem>
                <SelectItem value="IMPACT">Impact Sponsor</SelectItem>
                <SelectItem value="SUPPORTING">Supporting Sponsor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={sponsor.website || ""}
              placeholder="https://example.com"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={sponsor.description || ""}
              placeholder="Brief description about the sponsor"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Order */}
          <div>
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              name="order"
              type="number"
              defaultValue={sponsor.order}
              min="0"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first
            </p>
          </div>

          {/* Visible */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="visible"
              name="visible"
              defaultChecked={sponsor.visible}
              value="true"
              disabled={isSubmitting}
              className="h-4 w-4"
            />
            <Label htmlFor="visible" className="cursor-pointer">
              Visible on website
            </Label>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Sponsor"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
