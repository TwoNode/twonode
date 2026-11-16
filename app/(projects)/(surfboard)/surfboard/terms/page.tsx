import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { SURFBOARD_PRIVACY_PATH, SURFBOARD_TERMS } from "@/lib/legal/surfboard";

export const metadata: Metadata = {
  title: "Terms of Use | Surfboard",
  description: "The terms for using Surfboard.",
};

export default function SurfboardTermsPage() {
  return (
    <LegalDocument
      doc={SURFBOARD_TERMS}
      backHref="/surfboard"
      backLabel="Surfboard"
      otherHref={SURFBOARD_PRIVACY_PATH}
      otherLabel="Read the Privacy Policy"
    />
  );
}
