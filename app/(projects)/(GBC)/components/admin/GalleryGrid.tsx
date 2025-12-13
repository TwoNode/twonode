"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Eye, EyeOff, Play, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteGBCGalleryItem } from "../../actions/gallery-actions";
import { GalleryItem, GBCMediaType } from "../../types/gallery";
import { EditGalleryModal } from "./EditGalleryModal";

interface GalleryGridProps {
  items: GalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKeys, setDeleteKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group by year
  const itemsByYear = items.reduce<Record<number, GalleryItem[]>>(
    (acc, item) => {
      if (!acc[item.year]) {
        acc[item.year] = [];
      }
      acc[item.year].push(item);
      return acc;
    },
    {}
  );

  const years = Object.keys(itemsByYear)
    .map(Number)
    .sort((a, b) => b - a); // Sort years in descending order

  async function handleDelete(id: string, mediaS3Key: string | null) {
    if (!mediaS3Key) {
      toast.error("Cannot delete: Missing media reference");
      return;
    }

    setIsDeleting(true);
    try {
      // Delete the media from S3
      const deleteResult = await fetch("/api/upload/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: mediaS3Key }),
      });

      if (!deleteResult.ok) {
        throw new Error("Failed to delete media from storage");
      }

      // Delete the gallery item from the database
      const result = await deleteGBCGalleryItem(id);

      if (result.success) {
        toast.success("Gallery item deleted successfully");
        setDeleteId(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete gallery item");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An error occurred while deleting the gallery item");
    } finally {
      setIsDeleting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-gray-500">No gallery items added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {years.map((year) => (
        <div key={year} className="space-y-4">
          <h2 className="text-2xl font-bold">{year}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {itemsByYear[year].map((item) => (
              <GalleryItemCard
                key={item.id}
                item={item}
                onDelete={() => {
                  setDeleteId(item.id);
                  setDeleteKeys([item.mediaS3Key || ""]);
                }}
              />
            ))}
          </div>
        </div>
      ))}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              {deleteKeys.length > 1 ? " selected items" : " gallery item"} and
              remove {deleteKeys.length > 1 ? "their" : "its"} associated media
              from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId, deleteKeys[0])}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GalleryItemCard({
  item,
  onDelete,
}: {
  item: GalleryItem;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isVideo = item.mediaType === "VIDEO";

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-gray-100">
        {isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <Play className="h-12 w-12 text-white/80" />
          </div>
        ) : (
          <img
            src={item.mediaUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        )}
        {!item.visible && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <EyeOff className="h-6 w-6 text-white" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          <EditGalleryModal item={item} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{item.title}</h3>
        {item.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{isVideo ? "Video" : "Image"}</span>
          <span className="flex items-center">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
}
