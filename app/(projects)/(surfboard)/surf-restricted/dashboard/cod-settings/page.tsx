"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  History,
  Loader2,
  AlertCircle,
  Undo2,
} from "lucide-react";
import {
  getCurrentSettings,
  updateSettings,
  getSettingsHistory,
  revertToPreviousSettings,
} from "../../../actions/settingsActions";

interface LGAFees {
  [lga: string]: number;
}

interface SettingsData {
  lgaFees: LGAFees;
  systemChargePercent: number;
}

export default function CODSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    lgaFees: {},
    systemChargePercent: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showAddLGA, setShowAddLGA] = useState(false);
  const [newLGA, setNewLGA] = useState({ name: "", rate: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const result = await getCurrentSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        toast.error(result.error || "Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("An error occurred while fetching settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const result = await getSettingsHistory();
      if (result.success && result.data) {
        setHistory(result.data);
        setShowHistory(true);
      } else {
        toast.error(result.error || "Failed to fetch history");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("An error occurred while fetching history");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateSettings(settings);
      if (result.success) {
        toast.success("Settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLGA = () => {
    if (!newLGA.name || !newLGA.rate) {
      toast.error("Please enter both LGA name and rate");
      return;
    }

    const rate = parseFloat(newLGA.rate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    setSettings({
      ...settings,
      lgaFees: {
        ...settings.lgaFees,
        [newLGA.name]: rate,
      },
    });

    setNewLGA({ name: "", rate: "" });
    setShowAddLGA(false);
    toast.success(`Added ${newLGA.name}`);
  };

  const handleRemoveLGA = (lga: string) => {
    const newFees = { ...settings.lgaFees };
    delete newFees[lga];
    setSettings({
      ...settings,
      lgaFees: newFees,
    });
    toast.success(`Removed ${lga}`);
  };

  const handleUpdateLGARate = (lga: string, rate: string) => {
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) return;

    setSettings({
      ...settings,
      lgaFees: {
        ...settings.lgaFees,
        [lga]: parsedRate,
      },
    });
  };

  const handleRevert = async (settingsId: string) => {
    try {
      const result = await revertToPreviousSettings(settingsId);
      if (result.success) {
        toast.success("Settings reverted successfully");
        setShowHistory(false);
        fetchSettings();
      } else {
        toast.error(result.error || "Failed to revert settings");
      }
    } catch (error) {
      console.error("Error reverting settings:", error);
      toast.error("An error occurred while reverting settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const lgaEntries = Object.entries(settings.lgaFees).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8 text-blue-600" />
            Certificate of Deposit Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage LGA fees and system configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchHistory}>
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Charge */}
      <Card>
        <CardHeader>
          <CardTitle>System Charge Percentage</CardTitle>
          <CardDescription>
            Percentage added to the base fee for system charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="systemCharge" className="w-32">
              Percentage:
            </Label>
            <Input
              id="systemCharge"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.systemChargePercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  systemChargePercent: parseFloat(e.target.value) || 0,
                })
              }
              className="w-32"
            />
            <span className="text-gray-600">%</span>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Example:</strong> If base fee is ₦5,000 and system charge
              is {settings.systemChargePercent}%, the total will be ₦
              {(5000 * (1 + settings.systemChargePercent / 100)).toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* LGA Fees */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>LGA Fee Rates</CardTitle>
              <CardDescription>
                Rate per square meter for each Local Government Area (₦/m²)
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddLGA(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add LGA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lgaEntries.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No LGA fees configured</p>
              <p className="text-sm text-gray-400 mt-1">
                Click "Add LGA" to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LGA Name</TableHead>
                  <TableHead>Rate (₦/m²)</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lgaEntries.map(([lga, rate]) => (
                  <TableRow key={lga}>
                    <TableCell className="font-medium">{lga}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate}
                        onChange={(e) =>
                          handleUpdateLGARate(lga, e.target.value)
                        }
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLGA(lga)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add LGA Dialog */}
      <Dialog open={showAddLGA} onOpenChange={setShowAddLGA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New LGA</DialogTitle>
            <DialogDescription>
              Enter the LGA name and rate per square meter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lgaName">LGA Name</Label>
              <Input
                id="lgaName"
                value={newLGA.name}
                onChange={(e) => setNewLGA({ ...newLGA, name: e.target.value })}
                placeholder="e.g., Eti-Osa"
              />
            </div>
            <div>
              <Label htmlFor="lgaRate">Rate (₦/m²)</Label>
              <Input
                id="lgaRate"
                type="number"
                min="0"
                step="0.01"
                value={newLGA.rate}
                onChange={(e) => setNewLGA({ ...newLGA, rate: e.target.value })}
                placeholder="e.g., 10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLGA(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLGA}>Add LGA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings History</DialogTitle>
            <DialogDescription>
              View and revert to previous settings configurations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {new Date(item.updatedAt).toLocaleString()}
                      </CardTitle>
                      <CardDescription>
                        {item.updatedBy
                          ? `Updated by ${item.updatedBy.firstName} ${item.updatedBy.lastName}`
                          : "System update"}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevert(item.id)}
                    >
                      <Undo2 className="w-4 h-4 mr-1" />
                      Revert
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 mb-2">
                        System Charge: {item.settings.systemChargePercent}%
                      </p>
                      <p className="font-medium text-gray-700 mb-1">
                        LGA Fees ({Object.keys(item.settings.lgaFees).length}):
                      </p>
                      <div className="max-h-32 overflow-y-auto text-xs text-gray-600">
                        {Object.entries(item.settings.lgaFees)
                          .sort((a: any, b: any) => a[0].localeCompare(b[0]))
                          .map(([lga, rate]: any) => (
                            <div key={lga}>
                              {lga}: ₦{rate}/m²
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
