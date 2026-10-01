export interface Speaker {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo: string;
  photoS3Key?: string | null;
  tier: "KEYNOTE" | "PANELIST" | "FIRESIDE_CHAT";
  company?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  order: number;
  visible: boolean;
  featured: boolean;
  edition: string;
  createdAt: Date;
  updatedAt: Date;
}
