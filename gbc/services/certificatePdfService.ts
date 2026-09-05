import path from "path";
import { execFile } from "child_process";
import type { GBCCertificateTicket } from "@/gbc/components/certificates/types";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com";
const WORKER_PATH = path.join(process.cwd(), "gbc", "pdf-worker", "certificate.render.cjs");

export function getCertificateVerificationUrl(ticketNumber: string): string {
  return `${SITE_URL}/gbc/certificate/${ticketNumber}`;
}

/**
 * Renders a ticket's certificate to a PDF buffer, in a standalone `node`
 * child process rather than in-process — see certificate.render.cjs for
 * why: rendering @react-pdf/renderer directly inside a Next.js Route
 * Handler throws "Minified React error #31", because Turbopack/webpack tag
 * any .tsx file they touch with Next's own React copy (used for RSC),
 * which isn't binary-compatible with the react@18.3.1 instance
 * @react-pdf/reconciler is pinned to. A plain node process never goes
 * through that bundler, so it renders exactly like the working standalone
 * script this was verified against.
 *
 * Shared by the download route
 * (app/api/v1/gbc/tickets/[ticketNumber]/certificate-pdf) and the
 * bulk-certificate-email flow (sendGBCCertificateEmail), so both produce
 * byte-identical certificates instead of drifting apart.
 */
export async function generateCertificatePdfBuffer(ticket: GBCCertificateTicket): Promise<Buffer> {
  const verificationUrl = getCertificateVerificationUrl(ticket.ticketNumber);
  const qrCodeDataUrl = await generateVerificationQRDataURL(verificationUrl);
  const input = JSON.stringify({ ticket, verificationUrl, qrCodeDataUrl });

  return new Promise<Buffer>((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [WORKER_PATH],
      { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Certificate PDF render failed: ${stderr?.toString("utf8") || err.message}`));
          return;
        }
        resolve(stdout as unknown as Buffer);
      }
    );
    child.stdin!.write(input);
    child.stdin!.end();
  });
}
