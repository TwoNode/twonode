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
import { gbcApi } from "@/gbc/apiClient";
import { GalleryItem, GBCMediaType } from "@/gbc/types/gallery";
import { EditGalleryModal } from "./EditGalleryModal";
import type { GBCEdition } from "@/gbc/utils/settings";

interface GalleryGridProps {
  items: GalleryItem[];
  editions: GBCEdition[];
}

export function GalleryGrid({ items, editions }: GalleryGridProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group by edition, in the order the server sent them (newest edition
  // first) — that also covers items whose edition is no longer in `editions`
  // (a soft-deleted one) without needing a separate sort.
  const groups: { key: string; items: GalleryItem[] }[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.key === item.edition);
    if (!group) {
      group = { key: item.edition, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  const editionName = (key: string) => editions.find((e) => e.key === key)?.name ?? `Edition ${key}`;

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      // gbcApi.gallery.remove already cleans up S3 (mediaS3Key/thumbnailS3Key)
      // server-side, including gracefully skipping items that never had one
      // (externally-hosted media) — no separate client-side S3 delete needed.
      const result = await gbcApi.gallery.remove(id);

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
      {groups.map((group) => (
        <div key={group.key} className="space-y-4">
          <h2 className="text-2xl font-bold">{editionName(group.key)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {group.items.map((item) => (
              <GalleryItemCard
                key={item.id}
                item={item}
                onDelete={() => setDeleteId(item.id)}
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
              gallery item and remove its associated media from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
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
