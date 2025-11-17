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
import { deleteGBCSponsor } from "../../actions/sponsor-actions";
import { deleteGBCFile } from "../../actions/upload-actions";
import { Pencil, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Sponsor } from "../../types/sponsor";

interface SponsorsListProps {
  sponsors: Sponsor[];
}

type SponsorTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTNER';

export function SponsorsList({ sponsors }: SponsorsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group sponsors by tier with proper typing
  const sponsorsByTier = sponsors.reduce<Record<SponsorTier, Sponsor[]>>(
    (acc, sponsor) => {
      const tier = sponsor.tier as SponsorTier;
      if (!acc[tier]) {
        acc[tier] = [];
      }
      acc[tier].push(sponsor);
      return acc;
    },
    {} as Record<SponsorTier, Sponsor[]>
  );

  const tiers: SponsorTier[] = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "PARTNER"];

  async function handleDelete(id: string, logoS3Key?: string) {
    setIsDeleting(true);
    try {
      // Delete logo from S3 if exists
      if (logoS3Key) {
        await deleteGBCFile(logoS3Key);
      }

      const result = await deleteGBCSponsor(id);
      if (result.success) {
        toast.success("Sponsor deleted successfully");
        setDeleteId(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete sponsor");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  if (sponsors.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-gray-500">No sponsors added yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {tiers.map((tier) => {
          const tierSponsors = sponsorsByTier[tier] || [];
          if (tierSponsors.length === 0) return null;

          return (
            <div key={tier}>
              <div className="mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {tier === "PLATINUM" && "💎"}
                  {tier === "GOLD" && "🥇"}
                  {tier === "SILVER" && "🥈"}
                  {tier === "BRONZE" && "🥉"}
                  {tier === "PARTNER" && "🤝"}
                  {tier} ({tierSponsors.length})
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tierSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    onDelete={() => {
                      setDeleteId(sponsor.id);
                      if (sponsor.logoS3Key) {
                        setDeleteKey(sponsor.logoS3Key);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sponsor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              sponsor and remove their logo from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && handleDelete(deleteId, deleteKey || undefined)
              }
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

function SponsorCard({
  sponsor,
  onDelete,
}: {
  sponsor: Sponsor;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-50 flex items-center justify-center p-6">
        <img
          src={sponsor.logo}
          alt={sponsor.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg">{sponsor.name}</h3>
          {sponsor.visible ? (
            <Eye className="h-5 w-5 text-green-600" />
          ) : (
            <EyeOff className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {sponsor.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {sponsor.description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            Order: {sponsor.order}
          </span>
          {sponsor.website && (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // TODO: Implement edit functionality
              toast.error("Edit feature coming soon");
            }}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
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
