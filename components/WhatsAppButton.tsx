"use client";

import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";

// Shared support line already used company-wide (Footer.tsx's "Have a
// question?" contact, RevaReportPDF's footer, GBC's default contact.phone).
const SUPPORT_NUMBER = "2349160002740";

// Only shown on customer-facing pages — never inside an authenticated
// admin/staff dashboard, where support already happens through other
// channels and a chat bubble would just sit on top of tables and modals.
const HIDDEN_PATH_PATTERNS = ["-restricted", "-mda"];

function messageForPath(pathname: string) {
  if (pathname.startsWith("/gbc")) {
    return "Hi TwoNode Technologies, I have a question about GBC.";
  }
  if (pathname.startsWith("/reva")) {
    return "Hi TwoNode Technologies, I have a question about REVA.";
  }
  if (pathname.startsWith("/surfboard")) {
    return "Hi TwoNode Technologies, I have a question about Surfboard.";
  }
  return "Hi TwoNode Technologies, I have a question.";
}

export function WhatsAppButton() {
  const pathname = usePathname() || "";

  if (HIDDEN_PATH_PATTERNS.some((pattern) => pathname.includes(pattern))) {
    return null;
  }

  const href = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(messageForPath(pathname))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] motion-reduce:transition-none"
    >
      <FaWhatsapp className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
