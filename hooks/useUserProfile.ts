import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getProfile, updateProfile, type ProfileData } from '@/app/(projects)/(surboard)/actions/profile';

interface UserProfileState extends Omit<ProfileData, 'id' | 'email'> {
  email: string;
}

export function useUserProfile() {
  const [userData, setUserData] = useState<UserProfileState>({
    firstName: '',
    lastName: '',
    email: '',
    prefix: '',
    suffix: '',
    companyName: '',
    surconRegNumber: '',
    surconRegName: '',
    residenceState: '',
    logo: '',
    signature: '',
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
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            prefix: data.prefix || '',
            suffix: data.suffix || '',
            companyName: data.companyName || '',
            surconRegNumber: data.surconRegNumber || '',
            surconRegName: data.surconRegName || '',
            residenceState: data.residenceState || '',
            logo: data.logo || '',
            signature: data.signature || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    // Create a preview URL
    const fileUrl = URL.createObjectURL(file);
    
    if (type === 'logo') {
      setLogoFile(file);
      setUserData(prev => ({ ...prev, logo: fileUrl }));
    } else {
      setSignatureFile(file);
      setUserData(prev => ({ ...prev, signature: fileUrl }));
    }
  };

  // Handle file removal
  const handleRemoveFile = (type: 'logo' | 'signature') => {
    if (type === 'logo') {
      setLogoFile(null);
      setUserData(prev => ({ ...prev, logo: '' }));
    } else {
      setSignatureFile(null);
      setUserData(prev => ({ ...prev, signature: '' }));
    }
  };

  // Save profile data
  const saveProfile = async () => {
    try {
      setIsSaving(true);
      
      const formData = new FormData();
      
      // Add text fields
      Object.entries(userData).forEach(([key, value]) => {
        if (key !== 'logo' && key !== 'signature') {
          formData.append(key, value || '');
        }
      });
      
      // Add files if they exist
      if (logoFile) {
        formData.append('logo', logoFile);
      } else if (userData.logo === '') {
        formData.append('remove-logo', 'true');
      }
      
      if (signatureFile) {
        formData.append('signature', signatureFile);
      } else if (userData.signature === '') {
        formData.append('remove-signature', 'true');
      }
      
      const { data, error } = await updateProfile(formData);
      
      if (error) {
        throw new Error(error);
      }
      
      // Update the user data with the response
      if (data) {
        setUserData(prev => ({
          ...prev,
          ...data,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          prefix: data.prefix || '',
          suffix: data.suffix || '',
          companyName: data.companyName || '',
          surconRegNumber: data.surconRegNumber || '',
          surconRegName: data.surconRegName || '',
          residenceState: data.residenceState || '',
          logo: data.logo || '',
          signature: data.signature || '',
        }));
      }
      
      // Clear the file states since they've been uploaded
      if (logoFile) setLogoFile(null);
      if (signatureFile) setSignatureFile(null);
      
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
