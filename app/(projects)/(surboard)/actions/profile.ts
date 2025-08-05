'use server';

import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { uploadFile } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

// Types
export type ProfileData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  prefix: string | null;
  suffix: string | null;
  companyName: string | null;
  surconRegNumber: string | null;
  surconRegName: string | null;
  residenceState: string | null;
  logo: string | null;
  signature: string | null;
};

export async function getProfile(): Promise<{ data?: ProfileData; error?: string }> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    const dbUser = await prisma.surfboardUser.findUnique({
      where: { kindeId: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        prefix: true,
        suffix: true,
        companyName: true,
        surconRegNumber: true,
        surconRegName: true,
        residenceState: true,
        logo: true,
        signature: true,
      },
    });

    if (!dbUser) {
      return { error: 'User not found' };
    }

    return { data: dbUser };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { error: 'Failed to fetch profile' };
  }
}

export async function updateProfile(
  formData: FormData
): Promise<{ data?: ProfileData; error?: string }> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    const updates: Record<string, any> = {};
    
    // Handle text fields
    const textFields = [
      'firstName',
      'lastName',
      'prefix',
      'suffix',
      'companyName',
      'surconRegNumber',
      'surconRegName',
      'residenceState',
    ] as const;

    textFields.forEach((field) => {
      const value = formData.get(field);
      if (value !== null) {
        updates[field] = value === '' ? null : value;
      }
    });

    // Handle file uploads
    const fileFields = ['logo', 'signature'] as const;

    for (const field of fileFields) {
      const file = formData.get(field) as File | null;
      if (file && file.size > 0) {
        try {
          // Upload file to storage
          const fileUrl = await uploadFile(file, `users/${user.id}/${field}`);
          updates[field] = fileUrl;
        } catch (error) {
          console.error(`Error uploading ${field}:`, error);
          // Continue with other updates if file upload fails
        }
      } else if (formData.get(`remove-${field}`) === 'true') {
        updates[field] = null;
      }
    }

    // Update user in database
    const updatedUser = await prisma.surfboardUser.update({
      where: { kindeId: user.id },
      data: updates,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        prefix: true,
        suffix: true,
        companyName: true,
        surconRegNumber: true,
        surconRegName: true,
        residenceState: true,
        logo: true,
        signature: true,
      },
    });

    // Revalidate the settings page to show updated data
    revalidatePath('/dashboard/settings');
    
    return { data: updatedUser };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile' };
  }
}
