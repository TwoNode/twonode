// Plain CommonJS, no TypeScript/JSX — same reason as certificate.render.cjs:
// never imported by any app code, so Turbopack/webpack never touches it,
// and @react-pdf/renderer renders correctly only when it never goes through
// Next's bundler (see that file's header comment for the full explanation).
"use strict";

const path = require("path");
const React = require("react");
const { renderToBuffer, StyleSheet, Font, Document, Page, Text, View } = require("@react-pdf/renderer");

const fontPath = (file) => path.join(__dirname, "..", "..", "public", "fonts", file);

// Hand-rolled instead of date-fns: date-fns ships every locale as its own
// file (~5,300 files per copy traced into this worker's bundle), which was
// pushing Vercel deployments over its 15,000-file upload cap. This worker
// only ever needs "MMMM d, yyyy · h:mm a" in en-US, so Intl covers it with
// zero extra dependency weight.
function formatDate(date, opts) {
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

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

const INK = "#1A1024";
const PURPLE = "#5B21B6";
const GOLD = "#C9A24B";
const PAPER = "#FBF8F2";
const MUTED = "#6B6472";
const GREEN = "#15803D";

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, fontFamily: "Bricolage", padding: 48 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  wordmark: { fontSize: 15, fontWeight: 800, color: INK, letterSpacing: 1 },
  wordmarkSub: { fontSize: 8, fontWeight: 500, color: MUTED, marginTop: 2, letterSpacing: 0.5 },
  statusPill: {
    borderWidth: 1,
    borderColor: GREEN,
    color: GREEN,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  title: { fontSize: 22, fontWeight: 800, color: INK, marginBottom: 4 },
  subtitle: { fontSize: 10, fontWeight: 500, color: MUTED, marginBottom: 20 },
  divider: { borderBottomWidth: 1, borderBottomColor: GOLD, marginBottom: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5DFD3",
  },
  label: { fontSize: 9.5, fontWeight: 500, color: MUTED },
  value: { fontSize: 9.5, fontWeight: 600, color: INK, textAlign: "right", maxWidth: 280 },
  amountBlock: {
    marginTop: 24,
    backgroundColor: "#F3EEE3",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 10, fontWeight: 600, color: MUTED },
  amountValue: { fontSize: 20, fontWeight: 800, color: PURPLE },
  footer: { marginTop: 32, fontSize: 8, color: MUTED, lineHeight: 1.6, textAlign: "center" },
});

function formatNaira(kobo) {
  return `₦${kobo.toLocaleString("en-NG")}`;
}

function buildReceiptElement({ ticket }) {
  const edition = ticket.editionRef || {};
  const paymentDate = ticket.paymentDate ? new Date(ticket.paymentDate) : new Date();

  const rows = [
    ["Payer", ticket.name],
    ["Email", ticket.email],
    ["Ticket Number", ticket.ticketNumber],
    ["Ticket Type", String(ticket.ticketType).replace(/_/g, " ")],
    ["Event", edition.name || "GBC"],
    ["Payment Reference", ticket.paymentRef || "—"],
    ["Payment Method", ticket.paymentMethod ? ticket.paymentMethod.toUpperCase() : "—"],
    [
      "Date Paid",
      `${formatDate(paymentDate, { month: "long", day: "numeric", year: "numeric" })} · ${formatDate(paymentDate, { hour: "numeric", minute: "2-digit", hour12: true })}`,
    ],
  ];

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.topRow },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.wordmark }, (edition.name || "GBC").toUpperCase()),
          React.createElement(Text, { style: styles.wordmarkSub }, "GEOSPATIAL BUILDERS COURSE · TWONODE TECHNOLOGIES")
        ),
        React.createElement(Text, { style: styles.statusPill }, "PAID")
      ),
      React.createElement(Text, { style: styles.title }, "Payment Receipt"),
      React.createElement(Text, { style: styles.subtitle }, `Receipt for ${ticket.ticketNumber}`),
      React.createElement(View, { style: styles.divider }),
      ...rows.map(([label, value]) =>
        React.createElement(
          View,
          { style: styles.row, key: label },
          React.createElement(Text, { style: styles.label }, label),
          React.createElement(Text, { style: styles.value }, value)
        )
      ),
      React.createElement(
        View,
        { style: styles.amountBlock },
        React.createElement(Text, { style: styles.amountLabel }, "Amount Paid"),
        React.createElement(Text, { style: styles.amountValue }, formatNaira(ticket.price))
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        "This receipt confirms payment received by TwoNode Technologies for the Geospatial Builders Course.\nFor questions, contact info@twonodetechnologies.com."
      )
    )
  );
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await readStdin();
  const input = JSON.parse(raw);
  const element = buildReceiptElement(input);
  const buffer = await renderToBuffer(element);
  process.stdout.write(buffer);
}

main().catch((err) => {
  process.stderr.write(String((err && err.stack) || err));
  process.exit(1);
});
