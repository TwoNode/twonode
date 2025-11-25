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
import { Plus, Loader2, Image, Video } from "lucide-react";
import { toast } from "sonner";
import { uploadGBCGalleryMedia } from "../../actions/upload-actions";
import { createGBCGalleryItem } from "../../actions/gallery-actions";
import { Switch } from "@/components/ui/switch";

export function AddGalleryButton() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [visible, setVisible] = useState(true);

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

      // Upload media first
      if (!mediaFile) {
        toast.error("Please upload a file");
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append("file", mediaFile);

      const uploadResult = await uploadGBCGalleryMedia(uploadFormData);

      if (!uploadResult.success || !uploadResult.data) {
        toast.error("Failed to upload media");
        return;
      }

      // Add media URLs to form data
      formData.set("mediaUrl", uploadResult.data.url);
      formData.set("mediaS3Key", uploadResult.data.key);
      formData.set("mediaType", mediaType);
      formData.set("visible", visible.toString());

      if (uploadResult.data.thumbnailUrl) {
        formData.set("thumbnailUrl", uploadResult.data.thumbnailUrl);
      }
      if (uploadResult.data.thumbnailKey) {
        formData.set("thumbnailS3Key", uploadResult.data.thumbnailKey);
      }

      const result = await createGBCGalleryItem(formData);

      if (result.success) {
        toast.success("Media added successfully");
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to add media");
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
          Add Media
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Gallery Media</DialogTitle>
          <DialogDescription>
            Upload photos or videos from GBC events
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload */}
          <div>
            <Label htmlFor="media">Photo or Video *</Label>
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
                    Click to upload media
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
                    required
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
              placeholder="Brief description of this media"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Year */}
          <div>
            <Label htmlFor="year">Year *</Label>
            <Select name="year" required disabled={isSubmitting}>
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
              defaultValue="0"
              min="0"
              disabled={isSubmitting}
            />
          </div>

          {/* Visible */}
          <div className="flex items-center gap-2">
            <Switch
              id="visible"
              name="visible"
              defaultChecked
              checked={visible}
              onCheckedChange={() => setVisible(!visible)}
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
                  Uploading...
                </>
              ) : (
                "Add Media"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
