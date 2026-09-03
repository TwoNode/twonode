"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { gbcApi, type EditionAdminStats } from "@/gbc/apiClient";
import { GBC_COLORS } from "@/gbc/colors";
import type { GBCEdition } from "@/gbc/utils/settings";

/**
 * Full editions management table -- one row per edition with its own
 * tickets-sold/revenue, mirroring the GBC Design System artifact's admin
 * "Editions" screen (status pill, dates, tickets sold, revenue, and an
 * inline Activate/Archive/Set-active action per row) instead of the prior
 * single-edition dropdown, which only ever showed one edition's numbers
 * at a time and required a click to see any other edition's data.
 */

const STATUS_STYLE: Record<GBCEdition["status"], { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: "#D1FAE5", text: "#065f46", label: "Active" },
  UPCOMING: { bg: "#DBEAFE", text: "#1e3a8a", label: "Upcoming" },
  PAST: { bg: GBC_COLORS.surface.main, text: "#6B5A80", label: "Past" },
};

const nairaFormatter = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFormatter = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const emptyForm = { key: "", name: "", theme: "", subTheme: "", venue: "", startDate: "", endDate: "", ticketPrefix: "" };

export default function EditionsClient({ initialEditions }: { initialEditions: GBCEdition[] }) {
  const [editions, setEditions] = useState(initialEditions);
  const [statsByKey, setStatsByKey] = useState<Record<string, EditionAdminStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingStats(true);
    Promise.all(editions.map((e) => gbcApi.editions.adminStats(e.key))).then((results) => {
      if (cancelled) return;
      const next: Record<string, EditionAdminStats> = {};
      results.forEach((res, i) => {
        if (res.success) next[editions[i].key] = res.data;
      });
      setStatsByKey(next);
      setLoadingStats(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editions]);

  async function handleActivate(key: string) {
    setBusyKey(key);
    const res = await gbcApi.editions.activate(key);
    setBusyKey(null);
    if (res.success) {
      setEditions(res.data);
      toast.success(`GBC ${key} is now the active edition`);
    } else {
      toast.error(res.error);
    }
  }

  async function handleArchive(key: string) {
    setBusyKey(key);
    const res = await gbcApi.editions.archive(key);
    setBusyKey(null);
    if (res.success) {
      setEditions(res.data);
      toast.success(`GBC ${key} archived`);
    } else {
      toast.error(res.error);
    }
  }

  async function handleCreate() {
    setCreating(true);
    const res = await gbcApi.editions.create(form);
    setCreating(false);
    if (res.success) {
      setEditions(res.data);
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success(`GBC ${form.key} created`);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" style={{ background: GBC_COLORS.primary.main }} className="hover:brightness-110">
              <Plus className="h-4 w-4 mr-1" />
              New Edition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Edition</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              {(
                [
                  ["key", "Key (e.g. 3.0)"],
                  ["ticketPrefix", "Ticket Prefix (e.g. GBC3)"],
                  ["name", "Name"],
                  ["venue", "Venue"],
                  ["theme", "Theme"],
                  ["subTheme", "Sub-theme"],
                  ["startDate", "Start Date"],
                  ["endDate", "End Date"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className={field === "name" || field === "theme" || field === "subTheme" ? "col-span-2" : ""}>
                  <Label htmlFor={field}>{label}</Label>
                  <Input
                    id={field}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating || !form.key || !form.ticketPrefix}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Edition</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Theme</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Dates</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Tickets sold</th>
                <th className="px-4 py-3 font-semibold text-right hidden lg:table-cell">Revenue</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {editions.map((edition) => {
                const status = STATUS_STYLE[edition.status];
                const stats = statsByKey[edition.key];
                return (
                  <tr key={edition.key} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold">GBC {edition.key}</div>
                      <div className="text-xs text-gray-500">{edition.venue}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">{edition.theme}</td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-gray-600 whitespace-nowrap">
                      {dateFormatter(edition.startDate)} – {dateFormatter(edition.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-transparent" style={{ background: status.bg, color: status.text }}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {loadingStats ? "…" : (stats?.ticketsSold ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell font-mono">
                      {loadingStats ? "…" : stats ? nairaFormatter.format(stats.revenue) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {edition.status === "ACTIVE" ? (
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" disabled className="opacity-50">
                            Active
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(edition.key)}
                            disabled={busyKey === edition.key}
                          >
                            Archive
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#A78BFA]"
                          style={{ color: GBC_COLORS.primary.main }}
                          onClick={() => handleActivate(edition.key)}
                          disabled={busyKey === edition.key}
                        >
                          Set active
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
