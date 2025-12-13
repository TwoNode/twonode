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
import { createGBCSponsor } from "../../actions/sponsor-actions";
import { uploadGBCSponsorLogo } from "../../actions/upload-actions";
import { Plus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddSponsorButton() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

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

      // Upload logo first if provided
      let logoUrl = "";
      let logoS3Key = "";

      if (logoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", logoFile);

        const uploadResult = await uploadGBCSponsorLogo(uploadFormData);

        if (uploadResult.success && uploadResult.data) {
          logoUrl = uploadResult.data.url;
          logoS3Key = uploadResult.data.key;
        } else {
          toast.error("Failed to upload logo");
          return;
        }
      } else {
        toast.error("Please upload a logo");
        return;
      }

      // Add logo URL to form data
      formData.set("logo", logoUrl);
      formData.set("logoS3Key", logoS3Key);

      const result = await createGBCSponsor(formData);

      if (result.success) {
        toast.success("Sponsor added successfully");
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to add sponsor");
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Sponsor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Sponsor</DialogTitle>
          <DialogDescription>
            Add a new sponsor or partner for GBC 2.0
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <Label htmlFor="logo">Logo *</Label>
            <div className="mt-2">
              {logoPreview ? (
                <div className="relative w-full h-40 bg-gray-50 rounded-lg border-2 border-dashed flex items-center justify-center">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-32 max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview("");
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Click to upload logo
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
                    required
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
              placeholder="Company Name"
              disabled={isSubmitting}
            />
          </div>

          {/* Tier */}
          <div>
            <Label htmlFor="tier">Tier *</Label>
            <Select name="tier" required disabled={isSubmitting}>
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
              defaultValue="0"
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
              defaultChecked
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
                  Adding...
                </>
              ) : (
                "Add Sponsor"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
