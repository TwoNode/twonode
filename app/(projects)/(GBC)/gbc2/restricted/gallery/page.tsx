import { requireAdmin } from "../../../utils/auth";
import { getAllGalleryItems } from "../../../actions/sponsor-actions";
import { AddGalleryButton } from "../../../components/admin/AddGalleryButton";
import { GalleryGrid } from "../../../components/admin/GalleryGrid";
import { GalleryFilters } from "../../../components/admin/GalleryFilters";
import { GalleryItem } from "../../../types/gallery";
import { Card } from "@/components/ui/card";

export default async function AdminGalleryPage() {
  await requireAdmin();

  const galleryResult = await getAllGalleryItems();
  const items: GalleryItem[] = galleryResult.success
    ? galleryResult.data || []
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gallery Management</h1>
          <p className="text-gray-600">
            Upload and manage event photos and videos
          </p>
        </div>
        <AddGalleryButton />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Media Library</h2>
            <p className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? "item" : "items"} in gallery
            </p>
          </div>

          <GalleryFilters />
        </div>

        {items.length > 0 ? (
          <GalleryGrid items={items} />
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No media items yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first photo or video to get started.
            </p>
            <div className="mt-6">
              <AddGalleryButton />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
