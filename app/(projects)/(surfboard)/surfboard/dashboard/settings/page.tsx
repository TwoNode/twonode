"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { nigerianStates } from "@/lib/constants";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const {
    userData,
    isLoading,
    isSaving,
    handleInputChange,
    handleFileSelect,
    handleRemoveFile,
    saveProfile,
  } = useUserProfile();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveProfile();
    if (success) {
      router.refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Update your profile information and settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal information and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix</Label>
                <select
                  id="prefix"
                  name="prefix"
                  value={userData.prefix || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
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
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={userData.firstName || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={userData.lastName || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Input
                  id="suffix"
                  name="suffix"
                  value={userData.suffix || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. Jr., Sr., III"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userData.email}
                  disabled
                  className="bg-gray-100"
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
                  value={userData.residenceState || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
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
                  value={userData.companyName || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="surconRegNumber">SURCON Registration Number</Label>
                <Input
                  id="surconRegNumber"
                  name="surconRegNumber"
                  value={userData.surconRegNumber || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="surconRegName">Name as Registered with SURCON</Label>
                <Input
                  id="surconRegName"
                  name="surconRegName"
                  value={userData.surconRegName || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Logo & Signature</CardTitle>
            <CardDescription>
              Upload your company logo and signature for official documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {userData.logo ? (
                    <div className="relative">
                      <Image
                        src={userData.logo}
                        alt="Company Logo"
                        width={100}
                        height={100}
                        className="rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile('logo')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center w-full h-32">
                      <Upload className="w-6 h-6 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                    </div>
                  )}
                  <Input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'logo')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo')?.click()}
                  >
                    {userData.logo ? 'Change' : 'Upload'} Logo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 300x300px, Max size: 5MB
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Signature</Label>
                <div className="flex items-center gap-4">
                  {userData.signature ? (
                    <div className="relative">
                      <Image
                        src={userData.signature}
                        alt="Signature"
                        width={150}
                        height={60}
                        className="rounded-md border bg-white p-2"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile('signature')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center w-full h-32">
                      <Upload className="w-6 h-6 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                    </div>
                  )}
                  <Input
                    id="signature"
                    name="signature"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'signature')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('signature')?.click()}
                  >
                    {userData.signature ? 'Change' : 'Upload'} Signature
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 300x100px, Max size: 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
