export interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  mediaUrl: string;
  mediaS3Key: string | null;
  thumbnailUrl: string | null;
  thumbnailS3Key: string | null;
  year: number;
  order: number;
  visible: boolean;
  /** GBCEdition key this item belongs to. */
  edition: string;
  mediaType: GBCMediaType;
  createdAt: Date;
  updatedAt: Date;
}

export type GBCMediaType = "IMAGE" | "VIDEO";

export const GALLERY_TYPE_FILTERS = ["all", "photos", "videos"] as const;
export type GalleryTypeFilter = (typeof GALLERY_TYPE_FILTERS)[number];

export const GALLERY_SORTS = [
  "order",
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
] as const;
export type GallerySort = (typeof GALLERY_SORTS)[number];
