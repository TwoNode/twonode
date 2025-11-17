export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  logoS3Key?: string | null;
  tier: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "PARTNER";
  description?: string | null;
  website?: string | null;
  order: number;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}
