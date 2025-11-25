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
import { createGBCSpeaker } from "../../actions/speaker-actions";
import { uploadGBCSpeakerPhoto } from "../../actions/upload-actions";
import { Plus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddSpeakerButton() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Upload photo first if provided
      let photoUrl = "";
      let photoS3Key = "";

      if (photoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", photoFile);

        const uploadResult = await uploadGBCSpeakerPhoto(uploadFormData);

        if (uploadResult.success && uploadResult.data) {
          photoUrl = uploadResult.data.url;
          photoS3Key = uploadResult.data.key;
        } else {
          toast.error("Failed to upload photo");
          return;
        }
      } else {
        toast.error("Please upload a photo");
        return;
      }

      // Add photo URL to form data
      formData.set("photo", photoUrl);
      formData.set("photoS3Key", photoS3Key);

      const result = await createGBCSpeaker(formData);

      if (result.success) {
        toast.success("Speaker added successfully");
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to add speaker");
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
          Add Speaker
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Speaker</DialogTitle>
          <DialogDescription>Add a new speaker for GBC 2.0</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div>
            <Label htmlFor="photo">Photo *</Label>
            <div className="mt-2">
              {photoPreview ? (
                <div className="relative w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed flex items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Photo preview"
                    className="max-h-44 max-w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview("");
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Click to upload photo
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 5MB
                  </span>
                  <input
                    id="photo"
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
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title/Position *</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Chief Technology Officer"
              disabled={isSubmitting}
            />
          </div>

          {/* Tier */}
          <div>
            <Label htmlFor="tier">Speaker Tier *</Label>
            <Select name="tier" required disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEYNOTE">Keynote Speaker</SelectItem>
                <SelectItem value="PANELIST">Panelist</SelectItem>
                <SelectItem value="FIRESIDE_CHAT">Fireside Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Company */}
          <div>
            <Label htmlFor="company">Company (Optional)</Label>
            <Input
              id="company"
              name="company"
              placeholder="Company Name"
              disabled={isSubmitting}
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Biography *</Label>
            <Textarea
              id="bio"
              name="bio"
              required
              placeholder="Brief bio about the speaker..."
              rows={5}
              disabled={isSubmitting}
            />
          </div>

          {/* LinkedIn */}
          <div>
            <Label htmlFor="linkedin">LinkedIn URL (Optional)</Label>
            <Input
              id="linkedin"
              name="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/username"
              disabled={isSubmitting}
            />
          </div>

          {/* Twitter */}
          <div>
            <Label htmlFor="twitter">Twitter/X URL (Optional)</Label>
            <Input
              id="twitter"
              name="twitter"
              type="url"
              placeholder="https://twitter.com/username"
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

          {/* Featured */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              name="featured"
              disabled={isSubmitting}
              className="h-4 w-4"
            />
            <Label htmlFor="featured" className="cursor-pointer">
              Featured speaker
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
                "Add Speaker"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
