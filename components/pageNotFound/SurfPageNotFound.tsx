"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const SurfPageNotFound = ({
  url = "/surfboard/dashboard",
  urlText = "Surfboard Dashboard",
}: {
  url?: string;
  urlText?: string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Surfboard Page Not Found</h1>

      <p className="text-lg">
        Sorry, the page you are looking for does not exist.
      </p>

      <Button asChild variant="outline" className="mt-4" type="button">
        <Link href={url}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {urlText}
        </Link>
      </Button>
    </div>
  );
};
