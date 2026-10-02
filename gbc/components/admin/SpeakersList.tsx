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
import { gbcApi } from "@/gbc/apiClient";
import { Pencil, Trash2, ExternalLink, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "sonner";
import { Speaker } from "@/gbc/types/speaker";
import { EditSpeakerModal } from "./EditSpeakerModal";

interface SpeakersListProps {
  speakers: Speaker[];
}

type SpeakerTier = "KEYNOTE" | "PANELIST" | "FIRESIDE_CHAT";

export function SpeakersList({ speakers }: SpeakersListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group speakers by tier with proper typing
  const speakersByTier = speakers.reduce<Record<SpeakerTier, Speaker[]>>(
    (acc, speaker) => {
      const tier = speaker.tier as SpeakerTier;
      if (!acc[tier]) {
        acc[tier] = [];
      }
      acc[tier].push(speaker);
      return acc;
    },
    {} as Record<SpeakerTier, Speaker[]>
  );

  const tiers: SpeakerTier[] = ["KEYNOTE", "PANELIST", "FIRESIDE_CHAT"];

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      // gbcApi.speakers.remove already cleans up the photo from S3 server-side.
      const result = await gbcApi.speakers.remove(id);
      if (result.success) {
        toast.success("Speaker deleted successfully");
        setDeleteId(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete speaker");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  if (speakers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-gray-500">No speakers found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {tiers.map((tier) => {
          const tierSpeakers = speakersByTier[tier] || [];
          if (tierSpeakers.length === 0) return null;

          return (
            <div key={tier}>
              <div className="mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {tier === "KEYNOTE" && "🎤"}
                  {tier === "PANELIST" && "💬"}
                  {tier === "FIRESIDE_CHAT" && "🔥"}
                  {tier === "KEYNOTE"
                    ? "Keynote Speakers"
                    : tier === "PANELIST"
                      ? "Panelists"
                      : "Fireside Chat"}{" "}
                  ({tierSpeakers.length})
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tierSpeakers.map((speaker) => (
                  <SpeakerCard
                    key={speaker.id}
                    speaker={speaker}
                    onDelete={() => setDeleteId(speaker.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Speaker?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              speaker and remove their photo from storage.
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
    </>
  );
}

function SpeakerCard({
  speaker,
  onDelete,
}: {
  speaker: Speaker;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-6 relative">
        <img
          src={speaker.photo}
          alt={speaker.name}
          className="max-h-full max-w-full object-cover rounded-lg"
        />
        {speaker.featured && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-xs font-semibold">Featured</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg">{speaker.name}</h3>
            <p className="text-sm text-gray-600">{speaker.title}</p>
            {speaker.company && (
              <p className="text-xs text-gray-500">{speaker.company}</p>
            )}
          </div>
          {speaker.visible ? (
            <Eye className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <EyeOff className="h-5 w-5 text-gray-400 shrink-0" />
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{speaker.bio}</p>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            Order: {speaker.order}
          </span>
          {speaker.linkedin && (
            <a
              href={speaker.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {speaker.twitter && (
            <a
              href={speaker.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              X/Twitter
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <EditSpeakerModal speaker={speaker} />
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
