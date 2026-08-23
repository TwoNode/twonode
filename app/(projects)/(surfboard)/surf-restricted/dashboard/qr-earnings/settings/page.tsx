"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Plus, Trash2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getQREarningsSettings,
  QREarningsSettingsData,
} from "@/app/(projects)/(surfboard)/actions/qrEarningsActions";
import { updateQREarningsSettings } from "@/app/(projects)/(surfboard)/actions/qrAdminActions";
import { toast } from "sonner";

const EMPTY_SETTINGS: QREarningsSettingsData = {
  freeScanLimit: 5,
  service1: { verificationFee: 1000, serviceFeePercent: 10 },
  service2: { verificationFee: 2500, serviceFeePercent: 10 },
  customFees: [],
};

export default function QREarningsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] =
    useState<QREarningsSettingsData>(EMPTY_SETTINGS);

  useEffect(() => {
    getQREarningsSettings()
      .then((data) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateQREarningsSettings(settings);
      if (res.success) {
        toast.success("QR Earnings settings updated");
      } else {
        toast.error(res.error || "Failed to update settings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const updateCustomFee = (
    index: number,
    field: "name" | "amount" | "isPercentage",
    value: string | number | boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      customFees: prev.customFees.map((fee, i) =>
        i === index ? { ...fee, [field]: value } : fee,
      ),
    }));
  };

  const addCustomFee = () => {
    setSettings((prev) => ({
      ...prev,
      customFees: [
        ...prev.customFees,
        { name: "", amount: 0, isPercentage: false },
      ],
    }));
  };

  const removeCustomFee = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      customFees: prev.customFees.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <QrCode className="h-6 w-6 text-blue-600" />
          QR Earnings Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure the free-scan quota and service fees charged when a
          member of the public unlocks a survey plan via its QR code.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Free Scan Quota</CardTitle>
          <CardDescription>
            Number of free scans allowed per plan before the paywall kicks
            in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="freeScanLimit">Free Scan Limit</Label>
            <Input
              id="freeScanLimit"
              type="number"
              min={0}
              value={settings.freeScanLimit}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  freeScanLimit: Number(e.target.value),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service 1: Know Actual Location</CardTitle>
          <CardDescription>
            Interactive map, GPS directions & authenticity check.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Verification Fee (₦)</Label>
            <Input
              type="number"
              min={0}
              value={settings.service1.verificationFee}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  service1: {
                    ...prev.service1,
                    verificationFee: Number(e.target.value),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Service Fee (%)</Label>
            <Input
              type="number"
              min={0}
              value={settings.service1.serviceFeePercent}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  service1: {
                    ...prev.service1,
                    serviceFeePercent: Number(e.target.value),
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service 2: Access Certificate of Deposit</CardTitle>
          <CardDescription>
            Download of the official Certificate of Deposit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Verification Fee (₦)</Label>
            <Input
              type="number"
              min={0}
              value={settings.service2.verificationFee}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  service2: {
                    ...prev.service2,
                    verificationFee: Number(e.target.value),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Service Fee (%)</Label>
            <Input
              type="number"
              min={0}
              value={settings.service2.serviceFeePercent}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  service2: {
                    ...prev.service2,
                    serviceFeePercent: Number(e.target.value),
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Fees</CardTitle>
          <CardDescription>
            Additional fees (e.g. MDA cuts) applied on top of the
            verification fee for both services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.customFees.map((fee, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-slate-200"
            >
              <div className="space-y-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Name</Label>
                <Input
                  value={fee.name}
                  onChange={(e) => updateCustomFee(i, "name", e.target.value)}
                  placeholder="e.g. MDA Charge"
                />
              </div>
              <div className="space-y-1 w-32">
                <Label className="text-xs">
                  Amount {fee.isPercentage ? "(%)" : "(₦)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={fee.amount}
                  onChange={(e) =>
                    updateCustomFee(i, "amount", Number(e.target.value))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={fee.isPercentage}
                  onCheckedChange={(checked) =>
                    updateCustomFee(i, "isPercentage", checked)
                  }
                />
                <Label className="text-xs text-slate-500">Percentage</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCustomFee(i)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addCustomFee}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Fee
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
