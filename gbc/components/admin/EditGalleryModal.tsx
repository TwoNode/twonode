"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Image, Video, Pencil } from "lucide-react";
import { toast } from "sonner";
import { gbcApi } from "@/gbc/apiClient";
import { GalleryItem } from "@/gbc/types/gallery";
import { Switch } from "@/components/ui/switch";

interface EditGalleryModalProps {
  item: GalleryItem;
}

export function EditGalleryModal({ item }: EditGalleryModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>(item.mediaUrl);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">(item.mediaType);

  // Reset state when item changes or modal opens
  useEffect(() => {
    if (open) {
      setMediaPreview(item.mediaUrl);
      setMediaType(item.mediaType);
      setMediaFile(null);
    }
  }, [open, item]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);

      // Determine media type
      if (file.type.startsWith("image/")) {
        setMediaType("IMAGE");
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        setMediaType("VIDEO");
        setMediaPreview(URL.createObjectURL(file));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      let mediaUrl = item.mediaUrl;
      let mediaS3Key = item.mediaS3Key ?? undefined;
      let thumbnailUrl = item.thumbnailUrl ?? undefined;
      let thumbnailS3Key = item.thumbnailS3Key ?? undefined;

      // If a new file is uploaded, handle it
      if (mediaFile) {
        const uploadResult = await gbcApi.uploads.file("gallery-media", mediaFile);

        if (!uploadResult.success || !uploadResult.data) {
          toast.error("Failed to upload new media");
          setIsSubmitting(false);
          return;
        }

        mediaUrl = uploadResult.data.url;
        mediaS3Key = uploadResult.data.key;
        thumbnailUrl = uploadResult.data.thumbnailUrl;
        thumbnailS3Key = uploadResult.data.thumbnailKey;
      }

      const result = await gbcApi.gallery.update(item.id, {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        mediaType,
        mediaUrl,
        mediaS3Key,
        thumbnailUrl,
        thumbnailS3Key,
        year: parseInt(formData.get("year") as string),
        order: parseInt(formData.get("order") as string) || 0,
        visible: formData.get("visible") === "true",
      });

      if (result.success) {
        // If we uploaded a new file, delete the old one from S3
        if (mediaFile) {
          if (item.mediaS3Key) {
            await gbcApi.uploads.deleteFile(item.mediaS3Key);
          }
          if (item.thumbnailS3Key) {
            await gbcApi.uploads.deleteFile(item.thumbnailS3Key);
          }
        }

        toast.success("Gallery item updated successfully");
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update gallery item");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4 text-gray-700" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Gallery Item</DialogTitle>
          <DialogDescription>Update details or replace media</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload */}
          <div>
            <Label htmlFor="media">Photo or Video</Label>
            <div className="mt-2">
              {mediaPreview ? (
                <div className="relative w-full bg-gray-50 rounded-lg border-2 border-dashed overflow-hidden">
                  {mediaType === "IMAGE" ? (
                    <img
                      src={mediaPreview}
                      alt="Media preview"
                      className="w-full h-64 object-contain"
                    />
                  ) : (
                    <video
                      src={mediaPreview}
                      controls
                      className="w-full h-64"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview("");
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                    title="Remove media"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  {mediaType === "IMAGE" ? (
                    <Image className="h-12 w-12 text-gray-400 mb-2" />
                  ) : (
                    <Video className="h-12 w-12 text-gray-400 mb-2" />
                  )}
                  <span className="text-sm text-gray-500 mb-1">
                    Click to replace media
                  </span>
                  <span className="text-xs text-gray-400">
                    Images up to 10MB, Videos up to 100MB
                  </span>
                  <input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={item.title}
              placeholder="e.g., Opening Ceremony"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item.description || ""}
              placeholder="Brief description of this media"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Year */}
          <div>
            <Label htmlFor="year">Year *</Label>
            <Select
              name="year"
              required
              defaultValue={item.year.toString()}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order */}
          <div>
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              name="order"
              type="number"
              defaultValue={item.order}
              min="0"
              disabled={isSubmitting}
            />
          </div>

          {/* Visible */}
          <div className="flex items-center gap-2">
            <Switch
              id="visible"
              name="visible"
              defaultChecked={item.visible}
              value="true"
              disabled={isSubmitting}
            />

            <Label htmlFor="visible" className="cursor-pointer">
              Visible in gallery
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
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
