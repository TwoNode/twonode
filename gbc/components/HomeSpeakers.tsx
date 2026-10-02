"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Linkedin, Twitter, Building2 } from "lucide-react";
import { gbcApi } from "@/gbc/apiClient";
import { Speaker } from "@/gbc/types/speaker";

export default function HomeSpeakers() {
  const [allSpeakers, setAllSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpeakers = async () => {
      setIsLoading(true);
      try {
        const speakersResult = await gbcApi.speakers.list();
        if (speakersResult.success) {
          setAllSpeakers(speakersResult.data || []);
        }
      } catch (error) {
        console.error("Error fetching speakers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpeakers();
  }, []);

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-white dark:bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
            Our Speakers
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 px-2">
            Meet the industry leaders sharing their insights at GBC 2.0
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allSpeakers.map((speaker) => (
            <Card
              key={speaker.id}
              className="overflow-hidden group hover:shadow-2xl transition-all duration-300"
            >
              <div className="relative overflow-hidden bg-linear-to-br from-gray-100 to-gray-200 dark:from-surface dark:to-surface-muted">
                <img
                  src={speaker.photo}
                  alt={speaker.name}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500 h-64"
                />
                {speaker.featured && (
                  <div className="absolute top-4 right-4 bg-linear-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                    ⭐ Featured
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-xl">
                  {speaker.name}
                </h3>
                <p className="text-purple-600 dark:text-purple-400 font-semibold mb-2">
                  {speaker.title}
                </p>
                {speaker.company && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">{speaker.company}</span>
                  </div>
                )}
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {speaker.bio}
                </p>
                {(speaker.linkedin || speaker.twitter) && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                    {speaker.linkedin && (
                      <a
                        href={speaker.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                        <span className="text-sm font-medium">LinkedIn</span>
                      </a>
                    )}
                    {speaker.twitter && (
                      <a
                        href={speaker.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-600 hover:text-sky-700 transition-colors"
                      >
                        <Twitter className="h-5 w-5" />
                        <span className="text-sm font-medium">X/Twitter</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
