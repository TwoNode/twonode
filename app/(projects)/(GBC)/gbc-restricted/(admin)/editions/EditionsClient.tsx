"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, CheckCircle2, Wallet, Plus } from "lucide-react";
import { gbcApi, type EditionAdminStats } from "@/gbc/apiClient";
import type { GBCEdition } from "@/gbc/utils/settings";

const STATUS_VARIANT: Record<GBCEdition["status"], "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  UPCOMING: "secondary",
  PAST: "outline",
};

const nairaFormatter = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const emptyForm = { key: "", name: "", theme: "", subTheme: "", venue: "", startDate: "", endDate: "", ticketPrefix: "" };

export default function EditionsClient({ initialEditions }: { initialEditions: GBCEdition[] }) {
  const [editions, setEditions] = useState(initialEditions);
  const [selectedKey, setSelectedKey] = useState(initialEditions[0]?.key ?? "");
  const [stats, setStats] = useState<EditionAdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const selected = editions.find((e) => e.key === selectedKey) ?? null;

  async function loadStats(key: string) {
    setSelectedKey(key);
    setLoadingStats(true);
    const res = await gbcApi.editions.adminStats(key);
    setLoadingStats(false);
    if (res.success) {
      setStats(res.data);
    } else {
      setStats(null);
      toast.error(res.error);
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedKey} onValueChange={loadStats}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select an edition" />
            </SelectTrigger>
            <SelectContent>
              {editions.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  GBC {e.key} — {e.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          {selected && selected.status === "UPCOMING" && (
            <Button size="sm" onClick={() => handleActivate(selected.key)} disabled={busyKey === selected.key}>
              Activate
            </Button>
          )}
          {selected && selected.status === "ACTIVE" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleArchive(selected.key)}
              disabled={busyKey === selected.key}
            >
              Archive
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
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
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selected.name} — {selected.theme}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={<Ticket className="h-6 w-6" />} label="Tickets Sold" value={stats.ticketsSold} />
                <StatCard icon={<CheckCircle2 className="h-6 w-6" />} label="Checked In" value={stats.checkedIn} />
                <StatCard
                  icon={<Wallet className="h-6 w-6" />}
                  label="Revenue"
                  value={nairaFormatter.format(stats.revenue)}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select an edition to view its numbers.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
      <div className="text-purple-600">{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}
