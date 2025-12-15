import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getProfile,
  updateProfile,
  type ProfileData,
} from "@/app/(projects)/(surfboard)/actions/profile";

interface UserProfileState extends Omit<ProfileData, "id" | "email"> {
  email: string;
}

export function useSurfUserProfile() {
  const [userData, setUserData] = useState<UserProfileState>({
    firstName: "",
    lastName: "",
    email: "",
    prefix: "",
    suffix: "",
    companyName: "",
    surconRegNumber: "",
    surconRegName: "",
    residenceState: "",
    logo: "",
    signature: "",
    phoneNumber: "",
    address: "",
    payerID: null,
    payerIDType: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  // Load user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await getProfile();

        if (error) {
          throw new Error(error);
        }

        if (data) {
          setUserData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            prefix: data.prefix || "",
            suffix: data.suffix || "",
            companyName: data.companyName || "",
            surconRegNumber: data.surconRegNumber || "",
            surconRegName: data.surconRegName || "",
            residenceState: data.residenceState || "",
            logo: data.logo || "",
            signature: data.signature || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "",
            payerID: data.payerID ?? null,
            payerIDType: data.payerIDType || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file selection
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "signature"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    // Create a preview URL
    const fileUrl = URL.createObjectURL(file);

    if (type === "logo") {
      setLogoFile(file);
      setUserData((prev) => ({ ...prev, logo: fileUrl }));
    } else {
      setSignatureFile(file);
      setUserData((prev) => ({ ...prev, signature: fileUrl }));
    }
  };

  // Handle file removal
  const handleRemoveFile = (type: "logo" | "signature") => {
    if (type === "logo") {
      setLogoFile(null);
      setUserData((prev) => ({ ...prev, logo: "" }));
    } else {
      setSignatureFile(null);
      setUserData((prev) => ({ ...prev, signature: "" }));
    }
  };

  // Save profile data
  const saveProfile = async () => {
    try {
      setIsSaving(true);
      console.log("userData", userData);

      // Basic validation
      if (!userData.firstName || !userData.lastName) {
        toast.error("First name and last name are required");
        return false;
      }

      // Validate email format if it's being updated
      if (userData.email && !/\S+@\S+\.\S+/.test(userData.email)) {
        toast.error("Please enter a valid email address");
        return false;
      }

      const formData = new FormData();

      // Add text fields with proper type checking
      const textFields = [
        "firstName",
        "lastName",
        "prefix",
        "suffix",
        "companyName",
        "surconRegNumber",
        "surconRegName",
        "residenceState",
        "phoneNumber",
        "address",
        "payerIDType",
      ] as const;

      textFields.forEach((field) => {
        const value = userData[field] || "";
        formData.append(field, value);
      });

      // Handle payerID (integer)
      if (userData.payerID !== null && userData.payerID !== undefined) {
        formData.append("payerID", String(userData.payerID));
      } else {
        formData.append("payerID", "");
      }

      // Add files if they exist with better error handling
      try {
        if (logoFile) {
          formData.append("logo", logoFile);
        } else if (userData.logo === "") {
          formData.append("remove-logo", "true");
        }

        if (signatureFile) {
          formData.append("signature", signatureFile);
        } else if (userData.signature === "") {
          formData.append("remove-signature", "true");
        }
      } catch (error) {
        console.error("Error preparing files for upload:", error);
        toast.error("Error preparing files for upload");
        return false;
      }

      const { data, error } = await updateProfile(formData);

      if (error) {
        throw new Error(error);
      }

      // Update the user data with the response
      if (data) {
        const updatedData = {
          ...data,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || userData.email, // Preserve existing email if not in response
          prefix: data.prefix || "",
          suffix: data.suffix || "",
          companyName: data.companyName || "",
          surconRegNumber: data.surconRegNumber || "",
          surconRegName: data.surconRegName || "",
          residenceState: data.residenceState || "",
          logo: data.logo || "",
          signature: data.signature || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          payerID: data.payerID ?? null,
          payerIDType: data.payerIDType || "",
        };

        setUserData(updatedData);

        // Clear the file states since they've been uploaded
        if (logoFile) setLogoFile(null);
        if (signatureFile) setSignatureFile(null);

        toast.success("Profile updated successfully");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error
          ? `Failed to update profile: ${error.message}`
          : "An unexpected error occurred while updating your profile"
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    userData,
    isLoading,
    isSaving,
    handleInputChange,
    handleFileSelect,
    handleRemoveFile,
    saveProfile,
  };
}
