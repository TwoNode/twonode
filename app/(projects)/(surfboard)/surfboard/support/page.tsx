import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { SURFBOARD_PRIVACY_PATH } from "@/lib/legal/surfboard";
import { SURFBOARD_SUPPORT } from "@/lib/legal/surfboardSupport";

export const metadata: Metadata = {
  title: "Support | Surfboard",
  description:
    "How to reach Surfboard support and how to delete your Surfboard account and personal data.",
};

export default function SurfboardSupportPage() {
  return (
    <LegalDocument
      doc={SURFBOARD_SUPPORT}
      backHref="/surfboard"
      backLabel="Surfboard"
      otherHref={SURFBOARD_PRIVACY_PATH}
      otherLabel="Read the Privacy Policy"
      showEffectiveDate={false}
    />
  );
}
