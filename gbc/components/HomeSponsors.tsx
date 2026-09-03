"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { gbcApi } from "@/gbc/apiClient";

export default function HomeSponsors() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSponsors = async () => {
      setIsLoading(true);
      try {
        const sponsorsResult = await gbcApi.sponsors.list();
        if (sponsorsResult.success) {
          setSponsors(sponsorsResult.data?.slice(0, 6) ?? []);
        }
      } catch (error) {
        console.error("Error fetching sponsors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Our Sponsors & Partners
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2">
            Thank you to our amazing sponsors who make GBC possible
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 md:gap-8 items-center max-w-6xl mx-auto">
          {sponsors.map((sponsor: any) => (
            <div
              key={sponsor.id}
              className="flex items-center justify-center p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow"
            >
              <img
                src={sponsor.logo}
                alt={sponsor.name}
                className="max-h-16 w-auto object-contain"
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/gbc/sponsors">
            <Button variant="outline" size="lg">
              View All Sponsors
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
