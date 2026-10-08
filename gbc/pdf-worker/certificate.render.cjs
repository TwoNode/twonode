// Plain CommonJS, no TypeScript/JSX — deliberately never imported by any
// app code, so Turbopack/webpack never touches it. Rendering
// @react-pdf/renderer through Next's App Router bundler (even with the
// package marked as a serverExternalPackage) still produces a "Minified
// React error #31": Next's Route Handler build tags .tsx files it touches
// with its own React copy (the one used for RSC), which isn't
// binary-compatible with the react@18.3.1 instance @react-pdf/reconciler
// is pinned to — two different REACT_ELEMENT_TYPE tags, so react-pdf's own
// isValidElement check rejects elements React itself just created. Running
// this in a genuinely separate `node` process (spawned by
// certificatePdfService.ts) sidesteps the bundler entirely: same
// environment as generating the PDF from a standalone script, which
// renders correctly.
"use strict";

const path = require("path");
const fs = require("fs");
const React = require("react");
const {
  renderToBuffer,
  StyleSheet,
  Font,
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Line,
} = require("@react-pdf/renderer");

const fontPath = (file) =>
  path.join(__dirname, "..", "..", "public", "fonts", file);

// Hand-rolled instead of date-fns: date-fns ships every locale as its own
// file (~5,300 files per copy traced into this worker's bundle), which was
// pushing Vercel deployments over its 15,000-file upload cap. This worker
// only ever needs "MMMM d" / "MMMM d, yyyy" in en-US, so Intl covers it with
// zero extra dependency weight.
function formatDate(date, opts) {
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}
const BACKGROUND_IMAGE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "gbc",
  "gbcCertificateBg.jpeg"
);
const LOGO_PATH = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "gbc2",
  "gbc2LightLogo.png"
);
// Falls back to a blank line (no image) if this file is ever removed.
const SIGNATURE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "signatures",
  "olamide_signature_white.png"
);

Font.register({
  family: "Bricolage",
  fonts: [
    { src: fontPath("BricolageGrotesque-Regular.ttf"), fontWeight: "normal" },
    { src: fontPath("BricolageGrotesque-Medium.ttf"), fontWeight: 500 },
    { src: fontPath("BricolageGrotesque-SemiBold.ttf"), fontWeight: 600 },
    { src: fontPath("BricolageGrotesque-Bold.ttf"), fontWeight: "bold" },
    { src: fontPath("BricolageGrotesque-ExtraBold.ttf"), fontWeight: 800 },
  ],
});

// Dark treatment: a near-black plum base (same hue family as the old
// light-mode INK color, just inverted in role) with a translucent black
// scrim over the venue photo for depth, gold + soft lavender accents,
// and near-white body text in place of the old dark INK.
const BG_DARK = "#160E22";
const SCRIM = "#000000";
const INK = "#F7F4FB";
const PURPLE = "#C4B5FD";
const GOLD = "#C9A24B";
const MUTED = "#B4A9C4";

const styles = StyleSheet.create({
  page: { backgroundColor: BG_DARK, fontFamily: "Bricolage", padding: 0 },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 842,
    height: 595,
    opacity: 0.22,
    objectFit: "cover",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 842,
    height: 595,
    backgroundColor: SCRIM,
    opacity: 0.4,
  },
  frame: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 1.25,
    borderColor: GOLD,
  },
  frameInner: {
    position: "absolute",
    top: 27,
    left: 27,
    right: 27,
    bottom: 27,
    borderWidth: 0.5,
    borderColor: "#6D5490",
  },
  content: {
    position: "absolute",
    top: 48,
    left: 64,
    right: 64,
    bottom: 40,
    display: "flex",
    flexDirection: "column",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 90, height: 22.1, objectFit: "contain" },
  ticketNo: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 1,
    textAlign: "right",
  },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 600,
    color: GOLD,
    letterSpacing: 3,
    marginBottom: 18,
  },
  presentedTo: {
    fontSize: 11,
    fontWeight: 500,
    color: MUTED,
    marginBottom: 10,
  },
  name: {
    fontWeight: 800,
    color: INK,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingHorizontal: 28,
  },
  body: {
    fontSize: 11,
    fontWeight: 500,
    color: INK,
    lineHeight: 1.6,
    maxWidth: 420,
  },
  bodyEm: { fontWeight: 700, color: GOLD },
  bottomRow: { flexDirection: "row", alignItems: "flex-end" },
  verifyBlock: { flexDirection: "row", alignItems: "center", width: 260 },
  qr: { width: 46, height: 46, marginRight: 10, flexShrink: 0 },
  verifyText: { width: 204 },
  verifyLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  verifyUrl: { fontSize: 8, fontWeight: 500, color: PURPLE },
  signatureBlock: { flexGrow: 1, flexBasis: 0, alignItems: "center" },
  signatureImage: {
    width: 100,
    height: 32,
    marginBottom: -6,
    objectFit: "contain",
  },
  signatureLine: {
    width: 140,
    borderBottomWidth: 0.75,
    borderBottomColor: MUTED,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 0.5,
  },
  issuerBlock: { width: 230, textAlign: "right" },
  issuerName: { fontSize: 10, fontWeight: 700, color: INK, marginBottom: 2 },
  issuerDate: { fontSize: 8, fontWeight: 500, color: MUTED },
});

// Fits the holder's name on the page using the real glyph widths of the name
// font (name-widths.json, measured from BricolageGrotesque-ExtraBold). Long
// names drop in size, then split over two lines at the most even word break.
// This is a CommonJS copy of gbc/utils/certificateName.ts, which the web page
// uses with the same table; change them together.
const NAME_WIDTHS = require("./name-widths.json");
const NAME_MAX_WIDTH_PT = 640;
const NAME_MAX_SIZE = 34;
const NAME_TWO_LINE_MAX_SIZE = 28;
const NAME_MIN_ONE_LINE_SIZE = 22;
const NAME_MIN_SIZE = 12;

function nameWidthEm(text) {
  let total = 0;
  for (const ch of text)
    total += NAME_WIDTHS.widths[ch] ?? NAME_WIDTHS.fallback;
  return total;
}
const floorHalf = (n) => Math.floor(n * 2) / 2;

function fitName(rawName) {
  // Collapse whitespace and close up stray spaces inside brackets, so a break
  // can never leave a lone "(" at the end of a line.
  const name = String(rawName || "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
  const em = nameWidthEm(name);
  if (!em) return { size: NAME_MAX_SIZE, lines: [name] };
  const oneLine = NAME_MAX_WIDTH_PT / em;
  if (oneLine >= NAME_MIN_ONE_LINE_SIZE) {
    return { size: floorHalf(Math.min(NAME_MAX_SIZE, oneLine)), lines: [name] };
  }
  const words = name.split(" ");
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const widest = Math.max(...lines.map(nameWidthEm));
    if (!best || widest < best.widest) best = { lines, widest };
  }
  if (best) {
    const size = NAME_MAX_WIDTH_PT / best.widest;
    return {
      size: floorHalf(
        Math.max(NAME_MIN_SIZE, Math.min(NAME_TWO_LINE_MAX_SIZE, size))
      ),
      lines: best.lines,
    };
  }
  return { size: floorHalf(Math.max(NAME_MIN_SIZE, oneLine)), lines: [name] };
}

function cableMotif(corner) {
  const isTopRight = corner === "topRight";
  const lines = Array.from({ length: 9 }).map((_, i) => {
    const x = isTopRight ? 220 - i * 24 : i * 24;
    return React.createElement(Line, {
      key: i,
      x1: isTopRight ? 220 : 0,
      y1: 0,
      x2: x,
      y2: 160,
      stroke: GOLD,
      strokeWidth: 0.6,
    });
  });
  return React.createElement(
    Svg,
    {
      style: {
        position: "absolute",
        top: isTopRight ? 0 : undefined,
        bottom: isTopRight ? undefined : 0,
        right: isTopRight ? 0 : undefined,
        left: isTopRight ? undefined : 0,
        width: 220,
        height: 160,
        opacity: 0.35,
      },
      viewBox: "0 0 220 160",
    },
    lines
  );
}

function buildCertificateElement({ ticket, verificationUrl, qrCodeDataUrl }) {
  const edition = ticket.editionRef;
  const attendedDate = ticket.checkedInAt
    ? new Date(ticket.checkedInAt)
    : new Date(edition.endDate);
  const monthDay = { month: "long", day: "numeric" };
  const dateRange =
    formatDate(new Date(edition.startDate), monthDay) ===
    formatDate(new Date(edition.endDate), monthDay)
      ? formatDate(new Date(edition.startDate), {
          ...monthDay,
          year: "numeric",
        })
      : `${formatDate(new Date(edition.startDate), monthDay)}–${new Date(edition.endDate).getDate()}, ${new Date(edition.endDate).getFullYear()}`;

  const content = React.createElement(
    View,
    { style: styles.content },
    React.createElement(
      View,
      { style: styles.topRow },
      React.createElement(
        View,
        { style: styles.brandRow },
        React.createElement(Image, { style: styles.logo, src: LOGO_PATH })
      ),
      React.createElement(
        Text,
        { style: styles.ticketNo },
        `CERTIFICATE ${ticket.ticketNumber}`
      )
    ),
    React.createElement(
      View,
      { style: styles.center },
      React.createElement(
        Text,
        { style: styles.eyebrow },
        "CERTIFICATE OF ATTENDANCE"
      ),
      React.createElement(
        Text,
        { style: styles.presentedTo },
        "This certifies that"
      ),
      (() => {
        const fit = fitName(ticket.name);
        return React.createElement(
          Text,
          { style: [styles.name, { fontSize: fit.size, lineHeight: 1.15 }] },
          fit.lines.join("\n")
        );
      })(),
      React.createElement(
        Text,
        { style: styles.body },
        "participated in ",
        React.createElement(Text, { style: styles.bodyEm }, edition.name),
        `, held ${dateRange} at ${edition.venue}, under the theme "${edition.theme}: ${edition.subTheme}."`
      )
    ),
    React.createElement(
      View,
      { style: styles.bottomRow },
      React.createElement(
        View,
        { style: styles.verifyBlock },
        React.createElement(Image, { style: styles.qr, src: qrCodeDataUrl }),
        React.createElement(
          View,
          { style: styles.verifyText },
          React.createElement(
            Text,
            { style: styles.verifyLabel },
            "SCAN TO VERIFY"
          ),
          React.createElement(
            Text,
            { style: styles.verifyUrl },
            verificationUrl.replace(/^https?:\/\//, "")
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.signatureBlock },
        fs.existsSync(SIGNATURE_PATH)
          ? React.createElement(Image, {
              style: styles.signatureImage,
              src: SIGNATURE_PATH,
            })
          : null,
        React.createElement(View, { style: styles.signatureLine }),
        React.createElement(
          Text,
          { style: styles.signatureLabel },
          "AUTHORIZED SIGNATURE"
        )
      ),
      React.createElement(
        View,
        { style: styles.issuerBlock },
        React.createElement(
          Text,
          { style: styles.issuerName },
          "TwoNode Technologies"
        ),
        React.createElement(
          Text,
          { style: styles.issuerDate },
          formatDate(attendedDate, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        )
      )
    )
  );

  const page = React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: styles.page },
    React.createElement(Image, {
      src: BACKGROUND_IMAGE_PATH,
      style: styles.bgImage,
    }),
    React.createElement(View, { style: styles.scrim }),
    cableMotif("topRight"),
    cableMotif("bottomLeft"),
    React.createElement(View, { style: styles.frame }),
    React.createElement(View, { style: styles.frameInner }),
    content
  );

  return React.createElement(Document, null, page);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8"))
    );
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await readStdin();
  const input = JSON.parse(raw);
  const element = buildCertificateElement(input);
  const buffer = await renderToBuffer(element);
  process.stdout.write(buffer);
}

main().catch((err) => {
  process.stderr.write(String((err && err.stack) || err));
  process.exit(1);
});
