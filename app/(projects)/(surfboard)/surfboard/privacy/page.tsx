import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { SURFBOARD_PRIVACY, SURFBOARD_TERMS_PATH } from "@/lib/legal/surfboard";

export const metadata: Metadata = {
  title: "Privacy Policy | Surfboard",
  description:
    "What personal data Surfboard collects, why, who sees it and your rights.",
};

export default function SurfboardPrivacyPage() {
  return (
    <LegalDocument
      doc={SURFBOARD_PRIVACY}
      backHref="/surfboard"
      backLabel="Surfboard"
      otherHref={SURFBOARD_TERMS_PATH}
      otherLabel="Read the Terms of Use"
    />
  );
}
