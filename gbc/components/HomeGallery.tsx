"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Image as ImageIcon } from "lucide-react";
import { gbcApi } from "@/gbc/apiClient";
import type { GBCSettingsData } from "@/gbc/utils/settings";

export default function HomeGallery({
  gallery,
}: {
  /** Admin-configured gallery settings — undefined while the parent's settings fetch is still in flight (renders using the previous hardcoded defaults until it resolves). */
  gallery?: GBCSettingsData["gallery"];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGalleryItems = async () => {
      setIsLoading(true);
      try {
        // No year param here on purpose: this is a "highlights" teaser
        // across all editions/years, not a year-scoped view. `defaultYear`
        // is only meant to seed a year-filter *control* (gated behind
        // `showYearFilter`) — there's no such control on this teaser, and
        // hard-filtering by it here previously hid every item once the
        // setting's year didn't match the data's actual year.
        const galleryResult = await gbcApi.gallery.list();
        if (galleryResult.success) {
          setItems(galleryResult.data?.slice(0, gallery?.itemsPerPage ?? 6) ?? []);
        }
      } catch (error) {
        console.error("Error fetching gallery items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryItems();
  }, [gallery?.itemsPerPage]);

  // Settings hasn't resolved yet (gallery === undefined) — render with the
  // defaults above rather than blocking on it. Once it resolves, only hide
  // the section if the admin explicitly disabled it.
  if (gallery?.enabled === false) return null;

  return (
    <section className="py-12 sm:py-16 bg-gray-50 dark:bg-surface">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Gallery Highlights
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400">
            Snapshots from past GBC events
          </p>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-24 w-24 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No gallery items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="group relative bg-white dark:bg-surface-muted rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow"
              >
                <div className="relative aspect-video bg-gray-100 dark:bg-surface">
                  {item.mediaType === "VIDEO" ? (
                    <>
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-surface-muted">
                          <Play className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                          <Play className="h-8 w-8 text-purple-600" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">{item.title}</h3>
                  {item.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <a
                  href={item.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0"
                  aria-label={`View ${item.title}`}
                />
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link href="/gbc/gallery">
            <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              View Full Gallery
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
