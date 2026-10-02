"use client";

import { useEffect, useState } from "react";
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
import { Plus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { GBCEdition } from "@/gbc/utils/settings";
import type { SponsorTier } from "@/gbc/types/sponsor";

export function AddSponsorButton({ tiers }: { tiers: SponsorTier[] }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [editions, setEditions] = useState<GBCEdition[]>([]);
  const [defaultEdition, setDefaultEdition] = useState<string>("");

  useEffect(() => {
    if (!open || editions.length > 0) return;
    gbcApi.editions.list().then((res) => {
      if (res.success) setEditions(res.data);
    });
  }, [open, editions.length]);

  // Preselect the active edition as its own step, after the list has
  // rendered. Setting it in the same batch as the list makes Radix's hidden
  // native <select> sync the value before its <option>s exist, which reads
  // back as "" and clears the selection.
  useEffect(() => {
    if (editions.length === 0 || defaultEdition) return;
    setDefaultEdition(
      editions.find((e) => e.status === "ACTIVE")?.key ?? editions[0].key
    );
  }, [editions, defaultEdition]);

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

      if (!logoFile) {
        toast.error("Please upload a logo");
        return;
      }

      const uploadResult = await gbcApi.uploads.file("sponsor-logo", logoFile);
      if (!uploadResult.success || !uploadResult.data) {
        toast.error("Failed to upload logo");
        return;
      }

      const result = await gbcApi.sponsors.create({
        name: formData.get("name") as string,
        logo: uploadResult.data.url,
        logoS3Key: uploadResult.data.key,
        tier: formData.get("tier") as string,
        description: (formData.get("description") as string) || undefined,
        website: (formData.get("website") as string) || undefined,
        order: parseInt(formData.get("order") as string) || 0,
        // Preserves a pre-existing product bug: this checkbox has no
        // value="true", so formData's value is "on" not "true" when
        // checked — visible is effectively always false today. Not fixed
        // here to avoid silently changing live behavior; see the sibling
        // bug already flagged on AddSpeakerButton (Phase 5 step 5).
        visible: formData.get("visible") === "true",
        edition: defaultEdition || undefined,
      });

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
            Add a new sponsor or partner to an edition
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
                {tiers.map((tier) => (
                  <SelectItem key={tier.key} value={tier.key}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tiers.length === 0 && (
              <p className="mt-1 text-sm text-amber-700">
                There are no tiers yet. Close this and use “Manage tiers” to add
                one first.
              </p>
            )}
          </div>

          {/* Edition */}
          <div>
            <Label htmlFor="edition">Edition *</Label>
            <Select
              value={defaultEdition}
              onValueChange={(v) => v && setDefaultEdition(v)}
              disabled={isSubmitting || editions.length === 0}
            >
              <SelectTrigger>
                {/* A plain span instead of SelectValue's children override —
                    passing children to SelectValue throws a ref/portal
                    conflict in the installed Radix version. Select still
                    holds the value; this only controls display. */}
                <span
                  className={
                    defaultEdition ? "" : "text-slate-500 dark:text-slate-400"
                  }
                >
                  {editions.find((e) => e.key === defaultEdition)?.name ??
                    "Select edition"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {editions.map((edition) => (
                  <SelectItem key={edition.key} value={edition.key}>
                    {edition.name}
                  </SelectItem>
                ))}
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
