// src/app/(public)/gallery/page.tsx
import { Play, Image as ImageIcon } from "lucide-react";
import { getGalleryItems } from "@/gbc/services/cmsService";
import { getSettings } from "@/gbc/services/settingsService";
import { getEditions } from "@/gbc/services/editionService";
import Link from "next/link";
import GBC2Navbar from "@/gbc/components/Navbar";
import { GBC_COLORS, GBC_GRADIENTS } from "@/gbc/colors";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const settings = await getSettings();
  const gallerySettings = settings.gallery;
  const socialLinks = settings.contact;

  // No year filter applied here: `defaultYear` is only meant to seed a
  // year-filter *control* gated behind `gallerySettings.showYearFilter`,
  // which isn't built yet (new UI, out of scope for this fix). Hard-filtering
  // by defaultYear unconditionally previously hid every item whenever the
  // setting's year didn't match the actual data's year (confirmed live:
  // defaultYear defaulted to 2025, all real items are tagged 2024).
  const [allItems, editions] = await Promise.all([
    getGalleryItems(),
    getEditions(),
  ]);
  const items = allItems.slice(
    0,
    gallerySettings?.itemsPerPage ?? allItems.length
  );

  if (gallerySettings?.enabled === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GBC2Navbar />
        <div className="text-center py-24">
          <ImageIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-400 mb-2">
            Gallery unavailable
          </h2>
          <p className="text-gray-500">The gallery is currently disabled.</p>
        </div>
      </div>
    );
  }

  // One section per edition, newest first — the query already orders items by
  // edition start date, so first appearance is the right section order.
  const sections: { key: string; name: string; items: typeof items }[] = [];
  for (const item of items) {
    let section = sections.find((s) => s.key === item.edition);
    if (!section) {
      section = {
        key: item.edition,
        name:
          editions.find((e) => e.key === item.edition)?.name ??
          `GBC ${item.year}`,
        items: [],
      };
      sections.push(section);
    }
    section.items.push(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GBC2Navbar />

      {/* Hero Section */}
      <section
        className="relative py-16 sm:py-20 md:py-24 text-white"
        style={{ background: GBC_GRADIENTS.hero }}
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Link
            href="/gbc"
            className="flex items-center text-white/80 hover:text-white transition-colors text-sm sm:text-base"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 sm:w-5 sm:h-5 mr-1"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              Gallery
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 px-2">
              Moments from past GBC editions
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Content */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {sections.length === 0 ? (
            <div className="text-center py-24">
              <ImageIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-400 mb-2">
                No Media Yet
              </h2>
              <p className="text-gray-500">Gallery items will be added soon</p>
            </div>
          ) : (
            <div className="space-y-12 sm:space-y-16">
              {sections.map((section) => (
                <div key={section.key}>
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      {section.name}
                    </h2>
                    <div
                      className="h-1 w-16 sm:w-20 rounded"
                      style={{ background: GBC_COLORS.primary.main }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.items.map((item) => (
                      <GalleryItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Social Media Feed */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">
              Follow Us on Social Media
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 px-2">
              Stay updated with the latest news and highlights from GBC
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {socialLinks?.twitter && (
                <Link
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Twitter/X
                </Link>
              )}
              {socialLinks?.linkedin && (
                <Link
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
                >
                  LinkedIn
                </Link>
              )}
              {socialLinks?.instagram && (
                <Link
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
                >
                  Instagram
                </Link>
              )}
              {socialLinks?.facebook && (
                <Link
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Facebook
                </Link>
              )}
              {socialLinks?.youtube && (
                <Link
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  YouTube
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function GalleryItem({ item }: { item: any }) {
  return (
    <div className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        {item.mediaType === "VIDEO" ? (
          <>
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Play className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <Play
                  className="h-8 w-8 ml-1"
                  style={{ color: GBC_COLORS.primary.main }}
                />
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
        <h3 className="font-bold text-lg mb-1">{item.title}</h3>
        {item.description && (
          <p className="text-gray-600 text-sm line-clamp-2">
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
  );
}
