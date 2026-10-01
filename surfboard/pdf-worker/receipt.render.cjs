// Plain CommonJS, no TypeScript/JSX — same reason as
// gbc/pdf-worker/certificate.render.cjs: never imported by any app code, so
// Turbopack/webpack never touches it, and @react-pdf/renderer renders
// correctly only when it never goes through Next's bundler (rendering it
// inside a Route Handler throws "Minified React error #31" — Next tags any
// .tsx file it touches with a React copy that isn't binary-compatible with
// the react@18.3.1 instance @react-pdf/reconciler is pinned to).
"use strict";

const path = require("path");
const React = require("react");
const { renderToBuffer, StyleSheet, Font, Document, Page, Text, View } = require("@react-pdf/renderer");
const { format } = require("date-fns");

const fontPath = (file) => path.join(__dirname, "..", "..", "public", "fonts", file);

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

const INK = "#0A1F2E";
const BLUE = "#0077B6";
const BLUE_DARK = "#023E8A";
const PAPER = "#F7FAFC";
const MUTED = "#5B6B77";
const GREEN = "#15803D";
const AMBER = "#B45309";

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, fontFamily: "Bricolage", padding: 48 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  wordmark: { fontSize: 15, fontWeight: 800, color: INK, letterSpacing: 1 },
  wordmarkSub: { fontSize: 8, fontWeight: 500, color: MUTED, marginTop: 2, letterSpacing: 0.5 },
  statusPill: {
    borderWidth: 1,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  title: { fontSize: 22, fontWeight: 800, color: INK, marginBottom: 4 },
  subtitle: { fontSize: 10, fontWeight: 500, color: MUTED, marginBottom: 20 },
  divider: { borderBottomWidth: 1, borderBottomColor: BLUE, marginBottom: 20 },
  sectionLabel: { fontSize: 9, fontWeight: 700, color: BLUE_DARK, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DCE6EC",
  },
  label: { fontSize: 9.5, fontWeight: 500, color: MUTED },
  value: { fontSize: 9.5, fontWeight: 600, color: INK, textAlign: "right", maxWidth: 300 },
  amountBlock: {
    marginTop: 20,
    backgroundColor: "#E7F2F8",
    borderRadius: 8,
    padding: 16,
  },
  amountRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  amountRowLabel: { fontSize: 9.5, color: MUTED },
  amountRowValue: { fontSize: 9.5, fontWeight: 600, color: INK },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BLUE,
  },
  totalLabel: { fontSize: 11, fontWeight: 700, color: INK },
  totalValue: { fontSize: 18, fontWeight: 800, color: BLUE_DARK },
  footer: { marginTop: 32, fontSize: 8, color: MUTED, lineHeight: 1.6, textAlign: "center" },
});

function formatNaira(amount) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

const STATUS_LABEL = {
  PENDING_USER_PAYMENT: "PENDING",
  LASG_PAID: "PAID — AWAITING REVIEW",
  ACCOUNTS_APPROVED: "APPROVED",
  ACCOUNTS_DISAPPROVED: "DISAPPROVED",
  COMPLETED: "COMPLETED",
};

function buildReceiptElement({ batch }) {
  const submitter = batch.submitter || {};
  const payerName = submitter.companyName || `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim();
  const isApproved = batch.paymentStatus === "ACCOUNTS_APPROVED" || batch.paymentStatus === "COMPLETED";
  const statusColor = isApproved ? GREEN : batch.paymentStatus === "ACCOUNTS_DISAPPROVED" ? "#B91C1C" : AMBER;
  const paymentDate = batch.userPaymentDate ? new Date(batch.userPaymentDate) : new Date(batch.createdAt);

  const rows = [
    ["Payer", payerName || "—"],
    ["Batch Code", batch.batchCode],
    ["Plans in Batch", String(batch.planCount)],
    ["Payment Reference", batch.userPaymentRef || "—"],
    ["Date Paid", format(paymentDate, "MMMM d, yyyy · h:mm a")],
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
          React.createElement(Text, { style: styles.wordmark }, "SURFBOARD"),
          React.createElement(Text, { style: styles.wordmarkSub }, "CERTIFICATE OF DEPOSIT · TWONODE TECHNOLOGIES")
        ),
        React.createElement(
          Text,
          { style: [styles.statusPill, { borderColor: statusColor, color: statusColor }] },
          STATUS_LABEL[batch.paymentStatus] || batch.paymentStatus
        )
      ),
      React.createElement(Text, { style: styles.title }, "Payment Receipt"),
      React.createElement(Text, { style: styles.subtitle }, `Receipt for batch ${batch.batchCode}`),
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
        React.createElement(
          View,
          { style: styles.amountRow },
          React.createElement(Text, { style: styles.amountRowLabel }, "Plan Fees"),
          React.createElement(Text, { style: styles.amountRowValue }, formatNaira(batch.totalFees))
        ),
        React.createElement(
          View,
          { style: styles.amountRow },
          React.createElement(Text, { style: styles.amountRowLabel }, "System Charges"),
          React.createElement(Text, { style: styles.amountRowValue }, formatNaira(batch.systemCharges))
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, "Total Amount"),
          React.createElement(Text, { style: styles.totalValue }, formatNaira(batch.totalAmount))
        )
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        "This receipt confirms the Certificate of Deposit fee payment recorded by TwoNode Technologies for the above batch.\nFor questions, contact info@twonodetechnologies.com."
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
