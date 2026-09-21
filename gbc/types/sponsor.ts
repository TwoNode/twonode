export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  logoS3Key?: string | null;
  /** Key of a sponsor tier — HEADLINE, IMPACT, SUPPORTING, or an admin-made one. */
  tier: string;
  description?: string | null;
  website?: string | null;
  order: number;
  visible: boolean;
  edition: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorTier {
  key: string;
  name: string;
  description: string | null;
  size: "FEATURED" | "STANDARD" | "COMPACT" | string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorTierWithCount extends SponsorTier {
  sponsorCount: number;
}
