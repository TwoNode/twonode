"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { gbcApi } from "@/gbc/apiClient";
import type { SponsorTierWithCount } from "@/gbc/types/sponsor";
import { TIER_SIZES, TIER_SIZE_LABELS, type TierSize } from "@/gbc/utils/sponsorTiers";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function sizeLabel(size: string) {
  return TIER_SIZE_LABELS[size as TierSize] ?? size;
}

/**
 * Add, rename, reorder and delete sponsorship levels. The order here is the
 * order sections appear on the public sponsors page. Closing the dialog
 * refreshes the page so the sponsor forms and list pick up the changes.
 */
export function ManageSponsorTiersButton({ initialTiers }: { initialTiers: SponsorTierWithCount[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tiers, setTiers] = useState(initialTiers);
  const [busy, setBusy] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "", size: "STANDARD" as string });
  const [adding, setAdding] = useState({ name: "", description: "", size: "STANDARD" as string });

  async function reload() {
    const res = await gbcApi.sponsorTiers.list();
    if (res.success) setTiers(res.data);
  }

  async function run(action: () => Promise<{ success: boolean; error?: string }>, done: string) {
    setBusy(true);
    try {
      const res = await action();
      if (res.success) {
        toast.success(done);
        await reload();
        return true;
      }
      toast.error(res.error || "Something went wrong");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
    return false;
  }

  function move(index: number, by: -1 | 1) {
    const keys = tiers.map((t) => t.key);
    const target = index + by;
    if (target < 0 || target >= keys.length) return;
    [keys[index], keys[target]] = [keys[target], keys[index]];
    void run(() => gbcApi.sponsorTiers.reorder(keys), "Order saved");
  }

  async function saveEdit(key: string) {
    const ok = await run(
      () => gbcApi.sponsorTiers.update(key, { name: draft.name, description: draft.description, size: draft.size }),
      "Tier updated"
    );
    if (ok) setEditingKey(null);
  }

  async function addTier() {
    const ok = await run(
      () => gbcApi.sponsorTiers.create({ name: adding.name, description: adding.description, size: adding.size }),
      "Tier added"
    );
    if (ok) setAdding({ name: "", description: "", size: "STANDARD" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEditingKey(null);
          router.refresh();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Layers className="mr-2 h-4 w-4" />
          Manage tiers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sponsor tiers</DialogTitle>
          <DialogDescription>
            Tiers appear on the public sponsors page in this order. Renaming a tier keeps its sponsors in it.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2" aria-label="Sponsor tiers">
          {tiers.length === 0 && (
            <li className="rounded-md border border-dashed p-4 text-center text-sm text-gray-500">
              No tiers yet. Add your first one below.
            </li>
          )}
          {tiers.map((tier, index) => (
            <li key={tier.key} className="rounded-lg border p-3">
              {editingKey === tier.key ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`name-${tier.key}`}>Name</Label>
                    <Input id={`name-${tier.key}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor={`desc-${tier.key}`}>Tagline (optional)</Label>
                    <Input
                      id={`desc-${tier.key}`}
                      value={draft.description}
                      placeholder="Shown under the heading"
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`size-${tier.key}`}>Card size</Label>
                    <select id={`size-${tier.key}`} className={selectClass} value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })}>
                      {TIER_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {TIER_SIZE_LABELS[size]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(tier.key)} disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)} disabled={busy}>
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move ${tier.name} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move ${tier.name} down`} disabled={busy || index === tiers.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{tier.name}</p>
                    <p className="text-xs text-gray-500">
                      {sizeLabel(tier.size)} · {tier.sponsorCount} {tier.sponsorCount === 1 ? "sponsor" : "sponsors"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${tier.name}`}
                    disabled={busy}
                    onClick={() => {
                      setEditingKey(tier.key);
                      setDraft({ name: tier.name, description: tier.description ?? "", size: tier.size });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${tier.name}`}
                    className="text-red-600 hover:text-red-700"
                    disabled={busy}
                    title={tier.sponsorCount > 0 ? "Move its sponsors to another tier first" : undefined}
                    onClick={() => run(() => gbcApi.sponsorTiers.remove(tier.key), "Tier deleted")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <form
          className="space-y-3 rounded-lg border bg-gray-50 p-3 dark:bg-white/5"
          onSubmit={(e) => {
            e.preventDefault();
            void addTier();
          }}
        >
          <p className="text-sm font-medium">Add a tier</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-tier-name">Name</Label>
              <Input id="new-tier-name" value={adding.name} placeholder="e.g. Gold Partners" onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="new-tier-size">Card size</Label>
              <select id="new-tier-size" className={selectClass} value={adding.size} onChange={(e) => setAdding({ ...adding, size: e.target.value })}>
                {TIER_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {TIER_SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="new-tier-desc">Tagline (optional)</Label>
            <Input id="new-tier-desc" value={adding.description} placeholder="Shown under the heading" onChange={(e) => setAdding({ ...adding, description: e.target.value })} />
          </div>
          <Button type="submit" disabled={busy || adding.name.trim().length < 2}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add tier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
