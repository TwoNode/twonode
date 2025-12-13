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
  mediaType: GBCMediaType;
  createdAt: Date;
  updatedAt: Date;
}

export type GBCMediaType = 'IMAGE' | 'VIDEO';
