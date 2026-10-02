"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Trash2,
  RotateCcw,
  X,
  Calendar as CalendarIcon,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { gbcApi, type EditionAdminStats } from "@/gbc/apiClient";
import { GBC_COLORS } from "@/gbc/colors";
import type { GBCEdition } from "@/gbc/utils/settings";
import { cn } from "@/lib/utils";

/**
 * Full editions management table -- one row per edition with its own
 * tickets-sold/revenue, mirroring the GBC Design System artifact's admin
 * "Editions" screen (status pill, dates, tickets sold, revenue, and an
 * inline Activate/Archive/Set-active action per row) instead of the prior
 * single-edition dropdown, which only ever showed one edition's numbers
 * at a time and required a click to see any other edition's data.
 */

const STATUS_STYLE: Record<
  GBCEdition["status"],
  { bg: string; text: string; label: string }
> = {
  ACTIVE: { bg: "#D1FAE5", text: "#065f46", label: "Active" },
  UPCOMING: { bg: "#DBEAFE", text: "#1e3a8a", label: "Upcoming" },
  PAST: { bg: GBC_COLORS.surface.main, text: "#6B5A80", label: "Past" },
};

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});
const dateFormatter = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const emptyForm = {
  key: "",
  name: "",
  theme: "",
  subTheme: "",
  venue: "",
  startDate: "",
  endDate: "",
  ticketPrefix: "",
};

export default function EditionsClient({
  initialEditions,
}: {
  initialEditions: GBCEdition[];
}) {
  const [editions, setEditions] = useState(initialEditions);
  const [statsByKey, setStatsByKey] = useState<
    Record<string, EditionAdminStats>
  >({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [binOpen, setBinOpen] = useState(false);
  const [deletedEditions, setDeletedEditions] = useState<
    (GBCEdition & { deletedAt: string })[]
  >([]);
  const [loadingBin, setLoadingBin] = useState(false);
  const [permanentTarget, setPermanentTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingStats(true);
    Promise.all(editions.map((e) => gbcApi.editions.adminStats(e.key))).then(
      (results) => {
        if (cancelled) return;
        const next: Record<string, EditionAdminStats> = {};
        results.forEach((res, i) => {
          if (res.success) next[editions[i].key] = res.data;
        });
        setStatsByKey(next);
        setLoadingStats(false);
      }
    );
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

  function openEdit(edition: GBCEdition) {
    setEditForm({
      key: edition.key,
      name: edition.name,
      theme: edition.theme,
      subTheme: edition.subTheme,
      venue: edition.venue,
      startDate: edition.startDate.slice(0, 10),
      endDate: edition.endDate.slice(0, 10),
      ticketPrefix: edition.ticketPrefix,
    });
    setEditKey(edition.key);
  }

  async function handleUpdate() {
    if (!editKey) return;
    setSaving(true);
    const { key, ...rest } = editForm;
    const res = await gbcApi.editions.update(editKey, rest);
    setSaving(false);
    if (res.success) {
      setEditions(res.data);
      setEditKey(null);
      toast.success(`GBC ${editKey} updated`);
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(key: string) {
    setBusyKey(key);
    const res = await gbcApi.editions.delete(key);
    setBusyKey(null);
    setDeleteTarget(null);
    if (res.success) {
      setEditions(res.data);
      toast.success(`GBC ${key} moved to the recycle bin`);
    } else {
      toast.error(res.error);
    }
  }

  async function loadRecycleBin() {
    setLoadingBin(true);
    const res = await gbcApi.editions.recycleBin();
    setLoadingBin(false);
    if (res.success) {
      setDeletedEditions(res.data);
    } else {
      toast.error(res.error);
    }
  }

  async function handleRestore(key: string) {
    setBusyKey(key);
    const res = await gbcApi.editions.restore(key);
    setBusyKey(null);
    if (res.success) {
      setEditions(res.data);
      toast.success(`GBC ${key} restored`);
      loadRecycleBin();
    } else {
      toast.error(res.error);
    }
  }

  async function handlePermanentDelete(key: string) {
    setBusyKey(key);
    const res = await gbcApi.editions.permanentDelete(key);
    setBusyKey(null);
    setPermanentTarget(null);
    if (res.success) {
      setDeletedEditions(res.data);
      toast.success(`GBC ${key} permanently deleted`);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setBinOpen(true);
            loadRecycleBin();
          }}
        >
          Recycle bin
        </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              style={{ background: GBC_COLORS.primary.main }}
              className="hover:brightness-110"
            >
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
                ] as const
              ).map(([field, label]) => (
                <div
                  key={field}
                  className={
                    field === "name" ||
                    field === "theme" ||
                    field === "subTheme"
                      ? "col-span-2"
                      : ""
                  }
                >
                  <Label htmlFor={field}>
                    {label} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={field}
                    value={form[field]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field]: e.target.value }))
                    }
                  />
                </div>
              ))}

              {(
                [
                  ["startDate", "Start Date"],
                  ["endDate", "End Date"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <Label htmlFor={field}>
                    {label} <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={field}
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form[field] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form[field]
                          ? format(new Date(form[field]), "MMM d, yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          form[field] ? new Date(form[field]) : undefined
                        }
                        onSelect={(date) =>
                          date &&
                          setForm((f) => ({
                            ...f,
                            [field]: format(date, "yyyy-MM-dd"),
                          }))
                        }
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={
                  creating ||
                  !form.key ||
                  !form.ticketPrefix ||
                  !form.name ||
                  !form.venue ||
                  !form.theme ||
                  !form.subTheme ||
                  !form.startDate ||
                  !form.endDate
                }
              >
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
                <th className="px-4 py-3 font-semibold hidden md:table-cell">
                  Theme
                </th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">
                  Dates
                </th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">
                  Tickets sold
                </th>
                <th className="px-4 py-3 font-semibold text-right hidden lg:table-cell">
                  Revenue
                </th>
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
                      <div className="text-xs text-gray-500">
                        {edition.venue}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {edition.theme}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-gray-600 whitespace-nowrap">
                      {dateFormatter(edition.startDate)} –{" "}
                      {dateFormatter(edition.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className="border-transparent"
                        style={{ background: status.bg, color: status.text }}
                      >
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {loadingStats ? "…" : (stats?.ticketsSold ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell font-mono">
                      {loadingStats
                        ? "…"
                        : stats
                          ? nairaFormatter.format(stats.revenue)
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {edition.status === "ACTIVE" ? (
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="opacity-50"
                          >
                            Active
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(edition)}
                          >
                            <Pencil className="h-4 w-4" />
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
                        <div className="inline-flex gap-2">
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(edition)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setDeleteTarget(edition.key)}
                            disabled={busyKey === edition.key}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!editKey}
        onOpenChange={(open) => !open && setEditKey(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit GBC {editKey}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label htmlFor="edit-key">Key</Label>
              <Input id="edit-key" value={editForm.key} disabled />
            </div>
            <div>
              <Label htmlFor="edit-ticketPrefix">Ticket Prefix</Label>
              <Input
                id="edit-ticketPrefix"
                value={editForm.ticketPrefix}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, ticketPrefix: e.target.value }))
                }
              />
            </div>
            {(
              [
                ["name", "Name"],
                ["venue", "Venue"],
                ["theme", "Theme"],
                ["subTheme", "Sub-theme"],
              ] as const
            ).map(([field, label]) => (
              <div
                key={field}
                className={
                  field === "name" || field === "theme" || field === "subTheme"
                    ? "col-span-2"
                    : ""
                }
              >
                <Label htmlFor={`edit-${field}`}>{label}</Label>
                <Input
                  id={`edit-${field}`}
                  value={editForm[field]}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, [field]: e.target.value }))
                  }
                />
              </div>
            ))}

            {(
              [
                ["startDate", "Start Date"],
                ["endDate", "End Date"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <Label htmlFor={`edit-${field}`}>{label}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id={`edit-${field}`}
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editForm[field] && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm[field]
                        ? format(new Date(editForm[field]), "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        editForm[field] ? new Date(editForm[field]) : undefined
                      }
                      onSelect={(date) =>
                        date &&
                        setEditForm((f) => ({
                          ...f,
                          [field]: format(date, "yyyy-MM-dd"),
                        }))
                      }
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdate}
              disabled={
                saving ||
                !editForm.ticketPrefix ||
                !editForm.name ||
                !editForm.venue ||
                !editForm.theme ||
                !editForm.subTheme ||
                !editForm.startDate ||
                !editForm.endDate
              }
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete GBC {deleteTarget}?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the edition to the recycle bin — it drops off this
              list, but nothing is destroyed and it can be restored at any time.
              Its tickets, sponsors, speakers, and partners are unaffected
              either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={binOpen} onOpenChange={setBinOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recycle bin</DialogTitle>
          </DialogHeader>
          {loadingBin ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
          ) : deletedEditions.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              Nothing here.
            </p>
          ) : (
            <div className="space-y-2">
              {deletedEditions.map((edition) => (
                <div
                  key={edition.key}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
                >
                  <div>
                    <div className="font-semibold">GBC {edition.key}</div>
                    <div className="text-xs text-gray-500">
                      Deleted {dateFormatter(edition.deletedAt)}
                    </div>
                  </div>
                  <div className="inline-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(edition.key)}
                      disabled={busyKey === edition.key}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setPermanentTarget(edition.key)}
                      disabled={busyKey === edition.key}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!permanentTarget}
        onOpenChange={(open) => !open && setPermanentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete GBC {permanentTarget}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. It will be refused if the edition still has
              any tickets, sponsors, speakers, or partners attached to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                permanentTarget && handlePermanentDelete(permanentTarget)
              }
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
