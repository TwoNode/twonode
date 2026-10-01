import path from "path";
import { execFile } from "child_process";
import type { GBCCertificateTicket } from "@/gbc/components/certificates/types";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com";
const WORKER_PATH = path.join(process.cwd(), "gbc", "pdf-worker", "certificate.render.cjs");

// Tracing hint only. The worker above requires @react-pdf/renderer (and
// its transitive deps: fontkit, pdfkit, linebreak, unicode-properties,
// etc.) but certificate.render.cjs is deliberately never statically
// imported by any bundled app code (see that file's own comment for why —
// importing @react-pdf/renderer somewhere that actually *renders* through
// it would reintroduce the React-version mismatch the whole
// spawned-process design exists to avoid). That means Next's build-time
// output-file-tracer, which only walks the real require/import graph, has
// no way to discover @react-pdf/renderer is needed at runtime — it was
// silently pruned from the deployed serverless bundle, and the worker's
// own `require("@react-pdf/renderer")` threw "Cannot find module" in
// production (reproduced directly against the live deployment: a plain
// PDF-download hit returned 500, and this route's own .next/*.nft.json
// trace manifest confirmed the package was entirely absent).
//
// A real (not `require.resolve`) dynamic import — literal specifier, so
// @vercel/nft's static analyzer can see it — makes the tracer fully
// expand and include the package's real transitive dependency tree,
// correctly resolving through pnpm's symlinks; `require.resolve` alone
// was tried first and only pulled in a couple of files, not the full
// tree. Merely *importing* the module (never calling its
// render/createElement APIs from this process) doesn't trigger the
// React-instance conflict — only actually rendering through it does.
//
// Do NOT add `./node_modules/@react-pdf/**` to outputFileTracingIncludes
// instead: that was tried and bisected as the root cause of a separate,
// unrelated Vercel deploy failure ("Deploying outputs" erroring with an
// opaque "Unexpected error") — in this pnpm-managed repo those paths are
// symlinks into the .pnpm store, and that glob only matched the symlinks
// themselves, not their real targets, while somehow still breaking the
// deploy step. This import-based hint is the verified-working approach.
void import("@react-pdf/renderer").catch(() => {
  // Best-effort — the worker process does its own real require and will
  // surface a clear error there if the package is genuinely unavailable
  // at runtime.
});

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
