import path from "path";
import { execFile } from "child_process";

const WORKER_PATH = path.join(process.cwd(), "gbc", "pdf-worker", "receipt.render.cjs");

// Tracing hint only — see certificatePdfService.ts's identical comment for
// the full explanation. This worker also renders via @react-pdf/renderer
// and is equally invisible to Next's automatic output-file-tracing.
void import("@react-pdf/renderer").catch(() => {});

export type GBCReceiptTicket = {
  ticketNumber: string;
  name: string;
  email: string;
  ticketType: string;
  price: number;
  paymentRef: string | null;
  paymentMethod: string | null;
  paymentDate: Date | string | null;
  editionRef: { name: string };
};

/**
 * Renders a ticket's payment receipt to a PDF buffer in a standalone `node`
 * child process — see certificate.render.cjs / certificatePdfService.ts for
 * why (rendering @react-pdf/renderer inside a Next.js Route Handler throws
 * "Minified React error #31"). Same pattern, separate worker script since
 * a receipt and a certificate are rendered at very different moments
 * (payment vs. post-event) with no shared content.
 */
export async function generateTicketReceiptPdfBuffer(ticket: GBCReceiptTicket): Promise<Buffer> {
  const input = JSON.stringify({ ticket });

  return new Promise<Buffer>((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [WORKER_PATH],
      { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Receipt PDF render failed: ${stderr?.toString("utf8") || err.message}`));
          return;
        }
        resolve(stdout as unknown as Buffer);
      }
    );
    child.stdin!.write(input);
    child.stdin!.end();
  });
}
