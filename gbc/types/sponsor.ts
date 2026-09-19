export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  logoS3Key?: string | null;
  tier: "HEADLINE" | "IMPACT" | "SUPPORTING";
  description?: string | null;
  website?: string | null;
  order: number;
  visible: boolean;
  edition: string;
  createdAt: Date;
  updatedAt: Date;
}
