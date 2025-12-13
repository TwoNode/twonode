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
import { updateGBCSpeaker } from "../../actions/speaker-actions";
import { uploadGBCSpeakerPhoto } from "../../actions/upload-actions";
import { Pencil, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Speaker } from "../../types/speaker";

interface EditSpeakerModalProps {
  speaker: Speaker;
}

export function EditSpeakerModal({ speaker }: EditSpeakerModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(speaker.photo);

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

      // Handle photo upload if a new file is selected
      if (photoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", photoFile);

        const uploadResult = await uploadGBCSpeakerPhoto(uploadFormData);

        if (uploadResult.success && uploadResult.data) {
          formData.set("photo", uploadResult.data.url);
          formData.set("photoS3Key", uploadResult.data.key);
        } else {
          toast.error("Failed to upload new photo");
          setIsSubmitting(false);
          return;
        }
      } else {
        // Keep existing photo
        formData.set("photo", speaker.photo);
      }

      const result = await updateGBCSpeaker(speaker.id, formData);

      if (result.success) {
        toast.success("Speaker updated successfully");
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update speaker");
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
          <DialogTitle>Edit Speaker</DialogTitle>
          <DialogDescription>Update speaker details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div>
            <Label htmlFor="photo">Photo</Label>
            <div className="mt-2">
              {photoPreview ? (
                <div className="relative w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed flex items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Photo preview"
                    className="max-h-44 max-w-full object-cover rounded"
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
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Click to upload new photo
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
              defaultValue={speaker.name}
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
              defaultValue={speaker.title}
              placeholder="Chief Technology Officer"
              disabled={isSubmitting}
            />
          </div>

          {/* Tier */}
          <div>
            <Label htmlFor="tier">Speaker Tier *</Label>
            <Select
              name="tier"
              required
              defaultValue={speaker.tier}
              disabled={isSubmitting}
            >
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
              defaultValue={speaker.company || ""}
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
              defaultValue={speaker.bio}
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
              defaultValue={speaker.linkedin || ""}
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
              defaultValue={speaker.twitter || ""}
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
              defaultValue={speaker.order}
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
              defaultChecked={speaker.visible}
              value="true"
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
              defaultChecked={speaker.featured}
              value="true"
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
                  Updating...
                </>
              ) : (
                "Update Speaker"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
