"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Loader2,
  Upload,
  X,
  User,
  Briefcase,
  FileSignature,
  Save,
  ArrowLeft,
} from "lucide-react";
import { useSurfUserProfile } from "@/hooks/useSurfUserProfile";
import { nigerianStates } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [profileCompletion, setProfileCompletion] = useState(0);

  const {
    userData,
    isLoading,
    isSaving,
    handleInputChange,
    handleFileSelect,
    handleRemoveFile,
    saveProfile,
  } = useSurfUserProfile();

  // Calculate profile completion percentage
  useEffect(() => {
    if (userData) {
      const requiredFields = [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.companyName,
        userData.surconRegNumber,
        userData.signature,
        userData.logo,
        userData.surconRegName,
        userData.residenceState,
      ];

      const filledFields = requiredFields.filter(Boolean).length;
      const completion = Math.round(
        (filledFields / requiredFields.length) * 100
      );
      setProfileCompletion(completion);
    }
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Saving changes...");

    try {
      const success = await saveProfile();
      if (success) {
        toast.success("Profile updated successfully", { id: toastId });
        router.refresh();
      } else {
        toast.error("Failed to update profile. Please check your input.", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("An unexpected error occurred. Please try again later.", {
        id: toastId,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-xl font-medium">Loading your profile...</p>
          <p className="text-muted-foreground">
            Please wait while we load your information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile, security, and preferences
          </p>
        </div>

        <div className="w-full md:w-auto">
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Profile Completion &nbsp;
                </span>
                <span className="text-sm font-semibold">
                  {profileCompletion}%
                </span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs
        defaultValue="personal"
        className="space-y-6"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="personal">
            <User className="w-4 h-4 mr-2" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="professional">
            <Briefcase className="w-4 h-4 mr-2" />
            Professional
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Prefix</Label>
                    <select
                      id="prefix"
                      name="prefix"
                      value={userData.prefix || ""}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={isSaving}
                    >
                      <option value="">Select prefix</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="Engr.">Engr.</option>
                      <option value="Arc.">Arc.</option>
                      <option value="Surv.">Surv.</option>
                      <option value="Barr.">Barr.</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={userData.firstName || ""}
                      onChange={handleInputChange}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={userData.lastName || ""}
                      onChange={handleInputChange}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suffix">Suffix</Label>
                    <Input
                      id="suffix"
                      name="suffix"
                      value={userData.suffix || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. Jr., Sr., III"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact support to change your email address
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="residenceState">State of Residence</Label>
                    <select
                      id="residenceState"
                      name="residenceState"
                      value={userData.residenceState || ""}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={isSaving}
                    >
                      <option value="">Select state</option>
                      {nigerianStates.map((state) => (
                        <option key={state.name} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>
                  Update your professional details and credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={userData.companyName || ""}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surconRegNumber">
                      SURCON Registration Number
                    </Label>
                    <Input
                      id="surconRegNumber"
                      name="surconRegNumber"
                      value={userData.surconRegNumber || ""}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      placeholder="e.g. SURCON/RN/0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surconRegName">
                      Name as Registered with SURCON
                    </Label>
                    <Input
                      id="surconRegName"
                      name="surconRegName"
                      value={userData.surconRegName || ""}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                      {userData.logo ? (
                        <div className="relative group">
                          <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                            <img
                              src={userData.logo}
                              alt="Company Logo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile("logo")}
                            disabled={isSaving}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                            aria-label="Remove logo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="logo"
                          className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center w-full h-24 cursor-pointer hover:border-primary/50 transition-colors ${
                            isSaving ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Upload className="w-5 h-5 mb-1 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground text-center">
                            Click to upload or drag and drop
                          </p>
                        </label>
                      )}
                      <Input
                        id="logo"
                        name="logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "logo")}
                        className="hidden"
                        disabled={isSaving}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("logo")?.click()}
                        disabled={isSaving}
                      >
                        {userData.logo ? "Change" : "Upload"} Logo
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 300x300px, Max 5MB
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Signature</Label>
                    <div className="flex items-center gap-4">
                      {userData.signature ? (
                        <div className="relative group">
                          <div className="relative w-32 h-24 rounded-md overflow-hidden border bg-white p-2">
                            <img
                              src={userData.signature}
                              alt="Signature"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile("signature")}
                            disabled={isSaving}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                            aria-label="Remove signature"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="signature"
                          className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center w-full h-24 cursor-pointer hover:border-primary/50 transition-colors ${
                            isSaving ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FileSignature className="w-5 h-5 mb-1 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground text-center">
                            Upload Signature
                          </p>
                        </label>
                      )}
                      <Input
                        id="signature"
                        name="signature"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "signature")}
                        className="hidden"
                        disabled={isSaving}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document.getElementById("signature")?.click()
                        }
                        disabled={isSaving}
                      >
                        {userData.signature ? "Change" : "Upload"} Signature
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 300x100px, Max 5MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[120px]">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        </form>
      </Tabs>
    </div>
  );
}
