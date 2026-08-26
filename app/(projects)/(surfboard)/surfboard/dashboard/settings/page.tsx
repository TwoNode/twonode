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
  Settings,
  CheckCircle2,
} from "lucide-react";
import { sendAccountUpdateInquiry } from "../../../actions/settingsActions";
import { surfboardApi } from "@/surfboard/apiClient";
import { useSurfUserProfile } from "@/surfboard/hooks/useSurfUserProfile";
import { nigerianStates } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { InquiryModal } from "./InquiryModal";
import { SurveyorBankSettings } from "./SurveyorProfileSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
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
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);

  useEffect(() => {
    surfboardApi.qr.earningsOverview().then((res) => {
      if (res.success && res.data) {
        setBankDetails(res.data.bankDetails);
      }
    });
  }, []);

  const {
    userData,
    isLoading,
    isSaving,
    handleInputChange,
    handleFileSelect,
    handleRemoveFile,
    saveProfile,
  } = useSurfUserProfile();

  const isLocked = userData?.isKycValidated === true;

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

  const handleSendInquiry = async (details: string) => {
    setIsSendingInquiry(true);
    const res = await sendAccountUpdateInquiry(details);
    setIsSendingInquiry(false);
    if (res.success) {
      toast.success("Request sent to admin.");
      setInquiryModalOpen(false);
    } else {
      toast.error("Failed to send request.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 relative z-10" />
          </div>
          <p className="text-xl font-semibold text-gray-900">
            Loading your profile...
          </p>
          <p className="text-gray-600">
            Please wait while we load your information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6"
        >
          <div className="w-full lg:w-auto">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-3 sm:mb-4 -ml-2 hover:bg-white/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                Account Settings
              </h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base ml-14">
              Manage your profile, security, and preferences
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-auto"
          >
            <Card className="p-4 sm:p-5 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Profile Completion
                  </span>
                  <span className="text-lg font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {profileCompletion}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full"
                  />
                </div>
                {isLocked && (
                  <Button
                    variant="outline"
                    className="w-full mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => setInquiryModalOpen(true)}
                  >
                    Account Update Inquiry
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs
            defaultValue="personal"
            className="space-y-6"
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-3 max-w-lg h-12 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
              <TabsTrigger
                value="personal"
                className="data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all"
              >
                <User className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Personal</span>
                <span className="sm:hidden">Personal</span>
              </TabsTrigger>
              <TabsTrigger
                value="professional"
                className="data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Professional</span>
                <span className="sm:hidden">Pro</span>
              </TabsTrigger>
              <TabsTrigger
                value="bank"
                className="data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Bank Details</span>
                <span className="sm:hidden">Bank</span>
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="personal" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <CardTitle className="text-xl sm:text-2xl">
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Update your personal details and contact information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="prefix"
                          className="text-sm font-semibold"
                        >
                          Prefix
                        </Label>
                        <select
                          id="prefix"
                          name="prefix"
                          value={userData.prefix || ""}
                          onChange={handleInputChange}
                          className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          disabled={isSaving || isLocked}
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
                        <Label
                          htmlFor="firstName"
                          className="text-sm font-semibold"
                        >
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={userData.firstName || ""}
                          onChange={handleInputChange}
                          required
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="lastName"
                          className="text-sm font-semibold"
                        >
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={userData.lastName || ""}
                          onChange={handleInputChange}
                          required
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="suffix"
                          className="text-sm font-semibold"
                        >
                          Suffix
                        </Label>
                        <Input
                          id="suffix"
                          name="suffix"
                          value={userData.suffix || ""}
                          onChange={handleInputChange}
                          placeholder="e.g. Jr., Sr., III"
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="text-sm font-semibold"
                        >
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={userData.email}
                          disabled
                          className="bg-gray-100 border-gray-300"
                        />
                        <p className="text-xs text-gray-500">
                          Contact support to change your email address
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="residenceState"
                          className="text-sm font-semibold"
                        >
                          State of Residence
                        </Label>
                        <select
                          id="residenceState"
                          name="residenceState"
                          value={userData.residenceState || ""}
                          onChange={handleInputChange}
                          className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          disabled={isSaving || isLocked}
                        >
                          <option value="">Select state</option>
                          {nigerianStates.map((state) => (
                            <option key={state.name} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="phoneNumber"
                          className="text-sm font-semibold"
                        >
                          Phone Number
                        </Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          value={userData.phoneNumber || ""}
                          onChange={handleInputChange}
                          placeholder="e.g. +234 800 000 0000"
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label
                          htmlFor="address"
                          className="text-sm font-semibold"
                        >
                          Address
                        </Label>
                        <Input
                          id="address"
                          name="address"
                          value={userData.address || ""}
                          onChange={handleInputChange}
                          placeholder="Enter your address"
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="payerID"
                          className="text-sm font-semibold"
                        >
                          Payer ID
                        </Label>
                        <Input
                          id="payerID"
                          name="payerID"
                          type="number"
                          value={userData.payerID ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleInputChange({
                              ...e,
                              target: {
                                ...e.target,
                                name: "payerID",
                                value:
                                  value === "" ? null : parseInt(value, 10),
                              },
                            } as any);
                          }}
                          placeholder="Enter payer ID"
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="payerIDType"
                          className="text-sm font-semibold"
                        >
                          Payer ID Type
                        </Label>
                        <select
                          id="payerIDType"
                          name="payerIDType"
                          value={userData.payerIDType || ""}
                          onChange={handleInputChange}
                          className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          disabled={isSaving || isLocked}
                        >
                          <option value="">Select type</option>
                          <option value="Individual">Individual</option>
                          <option value="Commercial">Commercial</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="professional" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <CardTitle className="text-xl sm:text-2xl">
                      Professional Information
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Update your professional details and credentials.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="companyName"
                          className="text-sm font-semibold"
                        >
                          Company Name
                        </Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          value={userData.companyName || ""}
                          onChange={handleInputChange}
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="surconRegNumber"
                          className="text-sm font-semibold"
                        >
                          SURCON Registration Number
                        </Label>
                        <Input
                          id="surconRegNumber"
                          name="surconRegNumber"
                          value={userData.surconRegNumber || ""}
                          onChange={handleInputChange}
                          disabled={isSaving || isLocked}
                          placeholder="e.g. SURCON/RN/0000"
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label
                          htmlFor="surconRegName"
                          className="text-sm font-semibold"
                        >
                          Name as Registered with SURCON
                        </Label>
                        <Input
                          id="surconRegName"
                          name="surconRegName"
                          value={userData.surconRegName || ""}
                          onChange={handleInputChange}
                          disabled={isSaving || isLocked}
                          className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">
                          Company Logo
                        </Label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {userData.logo ? (
                            <div className="relative group">
                              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
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
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                                aria-label="Remove logo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor="logo"
                              className={`border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center w-full sm:w-32 h-24 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all ${
                                isSaving ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <Upload className="w-6 h-6 mb-1 text-gray-400" />
                              <p className="text-xs text-gray-500 text-center">
                                Upload
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
                            onClick={() =>
                              document.getElementById("logo")?.click()
                            }
                            disabled={isSaving}
                            className="w-full sm:w-auto border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                          >
                            {userData.logo ? "Change" : "Upload"} Logo
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Recommended: 300x300px, Max 5MB
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">
                          Signature
                        </Label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {userData.signature ? (
                            <div className="relative group">
                              <div className="relative w-32 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-white p-2 shadow-md">
                                <img
                                  src={userData.signature}
                                  alt="Signature"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile("signature")}
                                disabled={isSaving || isLocked}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                                aria-label="Remove signature"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor="signature"
                              className={`border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center w-full sm:w-32 h-24 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all ${
                                isSaving ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <FileSignature className="w-6 h-6 mb-1 text-gray-400" />
                              <p className="text-xs text-gray-500 text-center">
                                Upload
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
                            disabled={isSaving || isLocked}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              document.getElementById("signature")?.click()
                            }
                            disabled={isSaving || isLocked}
                            className="w-full sm:w-auto border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                          >
                            {userData.signature ? "Change" : "Upload"} Signature
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Recommended: 300x100px, Max 5MB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="bank" className="space-y-6">
                <SurveyorBankSettings initialBankDetails={bankDetails} />
              </TabsContent>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  disabled={isSaving || isLocked}
                  className="w-full sm:w-auto border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isLocked}
                  className="w-full sm:w-auto min-w-[140px] bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
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
              </motion.div>
            </form>
          </Tabs>
        </motion.div>
      </div>
      <InquiryModal
        open={inquiryModalOpen}
        onOpenChange={setInquiryModalOpen}
        onSend={handleSendInquiry}
        isSending={isSendingInquiry}
      />
    </div>
  );
}
