// scripts/generate-storage-summary-pdf.cjs
"use strict";

const path = require("path");
const fs = require("fs");
const React = require("react");
const {
  renderToFile,
  StyleSheet,
  Font,
  Document,
  Page,
  Text,
  View,
} = require("@react-pdf/renderer");

const fontPath = (file) =>
  path.join(__dirname, "..", "public", "fonts", file);

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

// Clean corporate color palette
const PRIMARY = "#0F172A"; // Slate 900
const SECONDARY = "#2563EB"; // Blue 600
const ACCENT = "#0D9488"; // Teal 600
const TEXT_DARK = "#1E293B"; // Slate 800
const TEXT_MUTED = "#64748B"; // Slate 500
const BG_LIGHT = "#F8FAFC"; // Slate 50
const BORDER = "#E2E8F0"; // Slate 200
const CARD_BG = "#FFFFFF";
const SUCCESS = "#16A34A";
const WARNING = "#D97706";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Bricolage",
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 9,
    color: TEXT_DARK,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: BORDER,
    paddingBottom: 14,
    marginBottom: 16,
  },
  logoGroup: {
    flexDirection: "column",
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  logoSub: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    fontWeight: 500,
    marginTop: 2,
  },
  metaGroup: {
    alignItems: "flex-end",
  },
  metaBadge: {
    backgroundColor: "#EFF6FF",
    color: SECONDARY,
    fontSize: 7,
    fontWeight: 600,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 7.5,
    color: TEXT_MUTED,
  },
  docTitleBlock: {
    marginBottom: 14,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: PRIMARY,
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontWeight: "normal",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  calloutCard: {
    backgroundColor: BG_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: SECONDARY,
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
  },
  calloutTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: SECONDARY,
    marginBottom: 3,
  },
  calloutText: {
    fontSize: 8.5,
    color: TEXT_DARK,
    lineHeight: 1.35,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BG_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#FAFBFD",
  },
  th: {
    fontSize: 7.5,
    fontWeight: 700,
    color: PRIMARY,
  },
  td: {
    fontSize: 8,
    color: TEXT_DARK,
  },
  grid2: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
    backgroundColor: BG_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
  },
  gridCardTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: PRIMARY,
    marginBottom: 3,
  },
  gridCardText: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.3,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SECONDARY,
    marginTop: 4,
    marginRight: 6,
  },
  bulletContent: {
    flex: 1,
    fontSize: 8.5,
    color: TEXT_DARK,
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
    fontSize: 7,
    color: TEXT_MUTED,
  },
});

function Header({ docTitle, docSubtitle }) {
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.logoGroup}>
          <Text style={styles.logoTitle}>TwoNode Technologies</Text>
          <Text style={styles.logoSub}>Cloud Infrastructure &amp; Technical Architecture</Text>
        </View>
        <View style={styles.metaGroup}>
          <Text style={styles.metaBadge}>ADR-0016 EVALUATION</Text>
          <Text style={styles.metaText}>Date: October 16, 2026 · Confidential</Text>
        </View>
      </View>
      {docTitle && (
        <View style={styles.docTitleBlock}>
          <Text style={styles.docTitle}>{docTitle}</Text>
          <Text style={styles.docSubtitle}>{docSubtitle}</Text>
        </View>
      )}
    </View>
  );
}

function Footer({ pageNumber, totalPages }) {
  return (
    <View style={styles.footer} fixed>
      <Text>TwoNode Technologies · Storage Architecture Evaluation &amp; Cost Analysis</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

const StorageReport = () => (
  <Document
    title="TwoNode Storage Architecture & Cost Analysis"
    author="TwoNode Technical Architecture Team"
    subject="Cloud Storage Provider Evaluation, Cost Simulation, and Zero-Downtime Migration"
  >
    {/* ================= PAGE 1: EXECUTIVE SUMMARY & S3 AUDIT ================= */}
    <Page size="A4" style={styles.page}>
      <Header
        docTitle="Object Storage Architecture & Cost Analysis"
        docSubtitle="Evaluation of AWS S3, Cloudflare R2, ImageKit, and Backblaze B2 with a Zero-Downtime Migration Blueprint"
      />

      <View style={styles.calloutCard}>
        <Text style={styles.calloutTitle}>EXECUTIVE SUMMARY &amp; KEY FINDINGS</Text>
        <Text style={styles.calloutText}>
          An empirical inventory audit of TwoNode&apos;s active AWS S3 storage (reva-store) reveals a total dataset
          of 7,344 objects occupying approximately 3.69 GB. Because total volume is under 4 GB, current AWS S3
          invoices are minimal ($0.50 to $3.00/month). However, AWS imposes an aggressive egress bandwidth
          penalty ($0.09/GB = $90/TB). With the deployment of in-page media viewers where surveyors and clients
          frequently inspect high-resolution CAD DWG files and 20MB–50MB survey PDFs, bandwidth poses an
          escalating financial liability. Cloudflare R2 provides an exact S3-compatible drop-in with 0.00 egress
          fees forever, reducing TwoNode&apos;s active monthly storage bill to 0.00 under its 10 GB free tier.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>1. Current AWS S3 Inventory &amp; Cost Audit</Text>
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "30%" }]}>Storage Prefix</Text>
          <Text style={[styles.th, { width: "18%" }]}>Objects</Text>
          <Text style={[styles.th, { width: "22%" }]}>Dataset Size</Text>
          <Text style={[styles.th, { width: "30%" }]}>Primary File Composition</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "30%", fontWeight: 600 }]}>surfboard/</Text>
          <Text style={[styles.td, { width: "18%" }]}>6,521</Text>
          <Text style={[styles.td, { width: "22%" }]}>2,977.8 MB (80.7%)</Text>
          <Text style={[styles.td, { width: "30%" }]}>Survey plan PDFs, DWG CAD, CoD copies</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "30%", fontWeight: 600 }]}>uploads/</Text>
          <Text style={[styles.td, { width: "18%" }]}>361</Text>
          <Text style={[styles.td, { width: "22%" }]}>601.2 MB (16.3%)</Text>
          <Text style={[styles.td, { width: "30%" }]}>Legacy survey scans, CoD receipts</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "30%", fontWeight: 600 }]}>reva/ &amp; private/reva/</Text>
          <Text style={[styles.td, { width: "18%" }]}>219</Text>
          <Text style={[styles.td, { width: "22%" }]}>92.1 MB (2.5%)</Text>
          <Text style={[styles.td, { width: "30%" }]}>Due diligence reports, site photos, docs</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "30%", fontWeight: 600 }]}>GBC2/</Text>
          <Text style={[styles.td, { width: "18%" }]}>242</Text>
          <Text style={[styles.td, { width: "22%" }]}>21.4 MB (0.5%)</Text>
          <Text style={[styles.td, { width: "30%" }]}>Conference gallery, logos, speaker photos</Text>
        </View>
        <View style={[styles.tableRow, { backgroundColor: "#F1F5F9" }]}>
          <Text style={[styles.td, { width: "30%", fontWeight: 700 }]}>Total reva-store</Text>
          <Text style={[styles.td, { width: "18%", fontWeight: 700 }]}>7,344 files</Text>
          <Text style={[styles.td, { width: "22%", fontWeight: 700 }]}>3,692.5 MB (3.69 GB)</Text>
          <Text style={[styles.td, { width: "30%", fontWeight: 700 }]}>Overall Catalog Footprint</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>2. Why Our Current AWS Bill is Under $3/Month</Text>
      
      <View style={styles.grid2}>
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Storage: ~$0.09 / month</Text>
          <Text style={styles.gridCardText}>
            AWS S3 Standard in Stockholm (eu-north-1) charges 0.023 per GB/mo. At 3.69 GB, raw disk storage
            costs only 0.085 monthly. Storage itself is never the primary cost driver for small data volumes.
          </Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Egress: 0.00 (Under 100 GB Free Tier)</Text>
          <Text style={styles.gridCardText}>
            AWS provides a universal 100 GB/month Data Transfer Out allowance across all global regions.
            Because current monthly downloads stay within 100 GB, bandwidth charges currently evaluate to zero.
          </Text>
        </View>
      </View>

      <View style={styles.grid2}>
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>API Requests: ~$0.20 – $0.50 / month</Text>
          <Text style={styles.gridCardText}>
            Class A operations (PUT, COPY, LIST) are billed at 0.005 per 1,000 requests, while Class B (GET)
            costs 0.0004 per 1,000. Routine user queries and CoD batch checks represent the bulk of the bill.
          </Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>The Hidden Scaling Risk ($90 / TB)</Text>
          <Text style={styles.gridCardText}>
            The moment user activity, surveyor plan lookups, or report downloads exceed 100 GB in a calendar
            month, AWS charges 0.09 per GB. At 500 GB egress, the AWS bill jumps to ~$45.00/mo.
          </Text>
        </View>
      </View>

      <Footer />
    </Page>

    {/* ================= PAGE 2: PROVIDER MATRIX & IMAGEKIT EVALUATION ================= */}
    <Page size="A4" style={styles.page}>
      <Header />

      <Text style={styles.sectionTitle}>3. Storage Provider Evaluation &amp; Cost Benchmark</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "22%" }]}>Provider</Text>
          <Text style={[styles.th, { width: "16%" }]}>Storage / GB</Text>
          <Text style={[styles.th, { width: "18%" }]}>Egress / GB</Text>
          <Text style={[styles.th, { width: "20%" }]}>Free Allowance</Text>
          <Text style={[styles.th, { width: "24%" }]}>S3 SDK Compatibility</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "22%", fontWeight: 600, color: SECONDARY }]}>Cloudflare R2</Text>
          <Text style={[styles.td, { width: "16%" }]}>$0.015</Text>
          <Text style={[styles.td, { width: "18%", color: SUCCESS, fontWeight: 700 }]}>$0.00 (Free)</Text>
          <Text style={[styles.td, { width: "20%" }]}>10 GB, 10M reads</Text>
          <Text style={[styles.td, { width: "24%" }]}>100% Native (@aws-sdk)</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "22%", fontWeight: 600 }]}>AWS S3 (Current)</Text>
          <Text style={[styles.td, { width: "16%" }]}>$0.023</Text>
          <Text style={[styles.td, { width: "18%", color: WARNING }]}>$0.090</Text>
          <Text style={[styles.td, { width: "20%" }]}>5 GB (Year 1 only)</Text>
          <Text style={[styles.td, { width: "24%" }]}>Baseline Native</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "22%", fontWeight: 600 }]}>Backblaze B2</Text>
          <Text style={[styles.td, { width: "16%" }]}>$0.006</Text>
          <Text style={[styles.td, { width: "18%" }]}>$0.010</Text>
          <Text style={[styles.td, { width: "20%" }]}>10 GB storage</Text>
          <Text style={[styles.td, { width: "24%" }]}>S3-Compatible Endpoint</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "22%", fontWeight: 600 }]}>Wasabi Hot Cloud</Text>
          <Text style={[styles.td, { width: "16%" }]}>$0.0069</Text>
          <Text style={[styles.td, { width: "18%" }]}>$0.00 (Fair-use)</Text>
          <Text style={[styles.td, { width: "20%" }]}>None (1 TB min)</Text>
          <Text style={[styles.td, { width: "24%" }]}>S3-Compatible Endpoint</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "22%", fontWeight: 600 }]}>ImageKit (Media)</Text>
          <Text style={[styles.td, { width: "16%" }]}>$0.050</Text>
          <Text style={[styles.td, { width: "18%" }]}>$0.080</Text>
          <Text style={[styles.td, { width: "20%" }]}>20 GB / mo free</Text>
          <Text style={[styles.td, { width: "24%" }]}>Proprietary SDK / API</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>4. Cost Projections Across Growth Horizons</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "28%" }]}>Scale Profile</Text>
          <Text style={[styles.th, { width: "24%" }]}>AWS S3 Monthly</Text>
          <Text style={[styles.th, { width: "24%" }]}>Cloudflare R2 Monthly</Text>
          <Text style={[styles.th, { width: "24%" }]}>Net Annual Savings</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "28%", fontWeight: 600 }]}>Current (3.7 GB, 50 GB egress)</Text>
          <Text style={[styles.td, { width: "24%" }]}>~$0.50 – $3.00</Text>
          <Text style={[styles.td, { width: "24%", color: SUCCESS, fontWeight: 700 }]}>$0.00 (Free Tier)</Text>
          <Text style={[styles.td, { width: "24%", color: SUCCESS }]}>~$36 / year</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "28%", fontWeight: 600 }]}>Active Growth (50 GB, 300 GB egress)</Text>
          <Text style={[styles.td, { width: "24%" }]}>~$21.00 / mo</Text>
          <Text style={[styles.td, { width: "24%", color: SUCCESS, fontWeight: 700 }]}>$0.60 / mo</Text>
          <Text style={[styles.td, { width: "24%", color: SUCCESS }]}>~$245 / year</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "28%", fontWeight: 600 }]}>Scale Production (250 GB, 1.5 TB egress)</Text>
          <Text style={[styles.td, { width: "24%" }]}>~$132.00 / mo</Text>
          <Text style={[styles.td, { width: "24%", color: SUCCESS, fontWeight: 700 }]}>$3.60 / mo</Text>
          <Text style={[styles.td, { width: "24%", color: SUCCESS }]}>~$1,540 / year</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>5. Technical Assessment: Why ImageKit is Unsuitable as Primary Storage</Text>
      
      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>Incompatible File Specialization: </Text>
          ImageKit is an image/video optimization Content Delivery Network. It specializes in real-time WebP/AVIF
          transcoding, facial cropping, and video compression. Over 75% of TwoNode&apos;s files are multi-page
          cadastral survey PDFs and raw binary AutoCAD (.dwg/.dxf) files that gain zero benefit from image engines.
        </Text>
      </View>

      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>330% Higher Storage Costs on Paid Tiers: </Text>
          While ImageKit offers a 20 GB free tier, exceeding that threshold triggers a mandatory $49/month plan
          with $0.05/GB storage rates (over 3.3x higher than Cloudflare R2&apos;s $0.015/GB).
        </Text>
      </View>

      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>Proprietary Non-S3 API: </Text>
          ImageKit does not support the standardized S3 HMAC signing protocol. Generating signed URLs for private
          surveyor files requires proprietary SDK calls rather than standard AWS S3 presigners.
        </Text>
      </View>

      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>Recommended Hybrid Role: </Text>
          If TwoNode ever requires dynamic thumbnail generation for GBC conference photos or REVA report previews,
          ImageKit should be mounted strictly as an external CDN proxy (Web Folder origin) pulling from R2,
          retaining R2 as the true single source of truth.
        </Text>
      </View>

      <Footer />
    </Page>

    {/* ================= PAGE 3: ZERO-DOWNTIME MIGRATION BLUEPRINT ================= */}
    <Page size="A4" style={styles.page}>
      <Header />

      <Text style={styles.sectionTitle}>6. Zero-Downtime Migration Blueprint (S3 to Cloudflare R2)</Text>

      <View style={styles.calloutCard}>
        <Text style={styles.calloutTitle}>ZERO LOCAL TRANSFERS &amp; ZERO DOWNTIME</Text>
        <Text style={styles.calloutText}>
          Migrating TwoNode&apos;s 7,344 objects (~3.69 GB) does not require downloading files locally or pausing
          production traffic. Cloudflare provides native cloud-to-cloud migration tools (Super Slurper and Sippy)
          that execute direct transfers over high-speed datacenter backbones in under 15 minutes.
        </Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "15%" }]}>Phase</Text>
          <Text style={[styles.th, { width: "30%" }]}>Action / Method</Text>
          <Text style={[styles.th, { width: "35%" }]}>Technical Mechanism</Text>
          <Text style={[styles.th, { width: "20%" }]}>Impact / Status</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "15%", fontWeight: 600 }]}>Phase 1</Text>
          <Text style={[styles.td, { width: "30%" }]}>Cloudflare Super Slurper</Text>
          <Text style={[styles.td, { width: "35%" }]}>Direct S3-to-R2 cloud copy via read-only AWS IAM credentials</Text>
          <Text style={[styles.td, { width: "20%", color: SUCCESS }]}>Completed in ~15m</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "15%", fontWeight: 600 }]}>Phase 2</Text>
          <Text style={[styles.td, { width: "30%" }]}>Sippy Lazy Replication</Text>
          <Text style={[styles.td, { width: "35%" }]}>On-demand fallback: any un-copied file is served from S3 &amp; mirrored to R2</Text>
          <Text style={[styles.td, { width: "20%", color: SUCCESS }]}>Zero user 404s</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "15%", fontWeight: 600 }]}>Phase 3</Text>
          <Text style={[styles.td, { width: "30%" }]}>Vercel Environment Switch</Text>
          <Text style={[styles.td, { width: "35%" }]}>Set STORAGE_PROVIDER=r2 and CLOUDFLARE_R2_* credentials in Vercel</Text>
          <Text style={[styles.td, { width: "20%" }]}>Instant cutover</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.td, { width: "15%", fontWeight: 600 }]}>Phase 4</Text>
          <Text style={[styles.td, { width: "30%" }]}>Custom Domain Binding</Text>
          <Text style={[styles.td, { width: "35%" }]}>Bind storage.twonodetechnologies.com to R2 with automated edge SSL</Text>
          <Text style={[styles.td, { width: "20%" }]}>Clean branding</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: "15%", fontWeight: 600 }]}>Phase 5</Text>
          <Text style={[styles.td, { width: "30%" }]}>30-Day S3 Decommission</Text>
          <Text style={[styles.td, { width: "35%" }]}>Retain AWS S3 bucket as read-only backup, delete after 30-day grace</Text>
          <Text style={[styles.td, { width: "20%", color: WARNING }]}>Safe rollback</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>7. Codebase Readiness &amp; Database Compatibility</Text>

      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>Adapter Pre-Built &amp; Tested: </Text>
          TwoNode already implements the pluggable storage architecture defined in ADR-0012. The adapter file
          lib/storage/providers/cloudflare-r2.ts is fully written, using @aws-sdk/client-s3 with region: auto
          and endpoint: https://account_id.r2.cloudflarestorage.com. Zero new client code is required.
        </Text>
      </View>

      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>Zero Database Schema Changes: </Text>
          TwoNode&apos;s database models (Property, OneTimeUserProperty, SurfboardPlan, GBCTicket) store relative
          or fully-qualified URL strings. Our extractKeyFromUrl() utility dynamically extracts the bare key
          regardless of whether the host prefix is S3 or R2. Signed links generated by our authenticated
          file gateways (/api/v1/surfboard/files/view and /api/v1/reva/files/view) continue functioning seamlessly.
        </Text>
      </View>

      <View style={styles.bulletItem}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletContent}>
          <Text style={{ fontWeight: 700 }}>Final Strategic Recommendation: </Text>
          Adopt Cloudflare R2 as the standard enterprise storage provider for TwoNode. The transition carries
          zero implementation risk, reduces active infrastructure overhead to $0.00/month under current volume,
          and permanently protects the business against unpredictable AWS bandwidth invoices.
        </Text>
      </View>

      <Footer />
    </Page>
  </Document>
);

async function main() {
  const outputPath = path.join(
    __dirname,
    "..",
    "out",
    "TwoNode_Storage_Architecture_and_Cost_Analysis.pdf"
  );
  console.log("Generating Storage Architecture & Cost Analysis PDF...");
  await renderToFile(React.createElement(StorageReport), outputPath);
  const stats = fs.statSync(outputPath);
  console.log(`PDF successfully generated at: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error("Failed to generate PDF:", err);
  process.exit(1);
});
