/**
 * Red Copy Submission PDF Document
 * Generates a formal letter for "Submission of Red Copies of Survey Plan"
 * matching the official DCA/MAA format used by registered surveyors.
 */

"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";

// Register fonts
Font.register({
  family: "Times-Roman",
  fonts: [
    { src: "/fonts/times.ttf" },
    { src: "/fonts/times-bold.ttf", fontWeight: "bold" },
  ],
});
// react-pdf has built-in support for Times-Roman, Times-Bold, etc. without needing to load .ttf if standard.
// We'll use the standard built-in "Times-Roman" which doesn't need to be explicitly registered if we just use the name, but setting font-family to "Times-Roman" is required.

// ============================================================================
// Types
// ============================================================================

export interface RedCopyPlanData {
  planNumber: string;
  pillarType: string;
  pillarCount: number;
  surveyTitle: string;
  locality: string;
  deededArea: string;
  zone: string;
  planType: string;
}

export interface RedCopySubmitterData {
  firstName: string;
  lastName: string;
  prefix?: string | null;
  suffix?: string | null;
  surconRegName?: string | null;
  surconRegNumber?: string | null;
  signature?: string | null;
  companyAddress?: string | null;
}

export interface RedCopyBatchPDFData {
  batchCode: string;
  createdAt: Date | string;
  plans: RedCopyPlanData[];
  submitter: RedCopySubmitterData;
  totalPlansInBatch: number;
  eligiblePlansCount: number;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    paddingTop: 120, // Leave space for letterhead
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Times-Roman",
    lineHeight: 1.5,
  },

  // Header section
  headerSection: {
    marginBottom: 10,
  },
  referenceText: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 10,
    marginBottom: 1,
  },
  dateText: {
    fontSize: 10,
    textAlign: "right",
    marginTop: -40,
    marginBottom: 20,
  },

  // Greeting
  greeting: {
    fontSize: 10,
    marginBottom: 12,
    marginTop: 5,
  },

  // Subject line
  subject: {
    fontSize: 11,
    fontWeight: "bold",
    textDecoration: "underline",
    marginBottom: 12,
    textAlign: "left",
  },

  // Body text
  bodyText: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: "justify",
    lineHeight: 1.6,
  },

  // Table styles
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#f5f5f5",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    minHeight: 25,
  },
  // Column header cells
  thSN: {
    width: "5%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  thPlanNo: {
    width: "22%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  thPillar: {
    width: "10%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  thTitle: {
    width: "18%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  thLocality: {
    width: "20%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  thSize: {
    width: "10%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  thRemarks: {
    width: "15%",
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  // Data cells
  tdSN: {
    width: "5%",
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  tdPlanNo: {
    width: "22%",
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  tdPillar: {
    width: "10%",
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  tdTitle: {
    width: "18%",
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  tdLocality: {
    width: "20%",
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  tdSize: {
    width: "10%",
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
  },
  tdRemarks: {
    width: "15%",
    padding: 4,
    fontSize: 8,
  },

  // Closing section
  closingSection: {
    marginTop: 15,
  },
  closingText: {
    fontSize: 10,
    marginBottom: 5,
  },
  signatureImage: {
    width: 120,
    height: 50,
    marginTop: 5,
    marginBottom: 0,
  },
  signatureLineContainer: {
    marginTop: 30,
    marginBottom: 2,
  },
  signatureLine: {
    width: 180,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    marginBottom: 2,
  },
  signerName: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  signerTitle: {
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 1,
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build the pillar description string (e.g. "4 Beacons", "6 Beacons")
 */
function getPillarDescription(pillarCount: number, pillarType: string): string {
  return `${pillarCount} ${pillarType}${pillarCount !== 1 && !pillarType.toLowerCase().endsWith("s") ? "s" : ""}`;
}

/**
 * Format the reference line from batch code and plan counts
 * e.g. "Batch No: SurfCoD_ABCD (7/8 ready)"
 */
function formatReferenceFromPlans(batchCode: string, eligible: number, total: number): string {
  return `Batch No: ${batchCode} (${eligible}/${total} ready)`;
}

/**
 * Build the remarks column based on planType and zone
 */
function getRemarks(plan: RedCopyPlanData): string {
  const parts: string[] = [];
  if (plan.zone) {
    parts.push(plan.zone);
  }
  if (
    plan.planType &&
    (plan.planType.toLowerCase().includes("change of title") ||
      plan.planType.toLowerCase().includes("withdrawal"))
  ) {
    parts.push("CHANGE OF TITLE");
  }
  return parts.join("\n") || "UTM(ZONE 31)";
}

/**
 * Format the submitter's full name
 */
function getFullName(submitter: RedCopySubmitterData): string {
  const parts: string[] = [];
  if (submitter.prefix) parts.push(submitter.prefix);
  parts.push(submitter.firstName.toUpperCase());
  parts.push(submitter.lastName.toUpperCase());
  if (submitter.suffix) parts.push(submitter.suffix);
  return parts.join(" ");
}

// ============================================================================
// PDF Document Component
// ============================================================================

export function RedCopySubmissionPDF({ data }: { data: RedCopyBatchPDFData }) {
  const { plans, submitter, createdAt, batchCode, eligiblePlansCount, totalPlansInBatch } = data;

  const formattedDate = format(new Date(createdAt), "dd-MM-yyyy");
  const referenceText = formatReferenceFromPlans(batchCode, eligiblePlansCount, totalPlansInBatch);
  const fullName = getFullName(submitter);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header: Reference and Address */}
        <View style={styles.headerSection}>
          <Text style={styles.referenceText}>{referenceText}</Text>
          <Text style={styles.addressLine}>The Surveyor General</Text>
          <Text style={styles.addressLine}>Governor&apos;s Office.</Text>
          <Text style={styles.addressLine}>Survey Division,</Text>
          <Text style={styles.addressLine}>Ikeja,</Text>
          <Text style={styles.addressLine}>Lagos State.</Text>
        </View>

        {/* Date - right aligned */}
        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Greeting */}
        <Text style={styles.greeting}>Dear Sir/Ma,</Text>

        {/* Subject */}
        <Text style={styles.subject}>
          SUBMISSION OF RED COPIES OF SURVEY PLAN
        </Text>

        {/* Body paragraphs */}
        <Text style={styles.bodyText}>
          In compliance with the survey practice in Lagos state, I hereby write
          to submit the following red copies of survey plans produced by me in
          Lagos state.
        </Text>
        <Text style={styles.bodyText}>
          Attached herewith are the red copy survey plans, copy of receipts and
          other relevant documents in Respect of the survey.
        </Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.thSN}>S/N</Text>
            <Text style={styles.thPlanNo}>PLAN NO.</Text>
            <Text style={styles.thPillar}>PILLAR{"\n"}NO.</Text>
            <Text style={styles.thTitle}>TITLE</Text>
            <Text style={styles.thLocality}>LOCALITY</Text>
            <Text style={styles.thSize}>SIZE (m²)</Text>
            <Text style={styles.thRemarks}>REMARKS</Text>
          </View>

          {/* Data Rows */}
          {plans.map((plan, index) => (
            <View key={plan.planNumber} style={styles.tableRow} wrap={false}>
              <Text style={styles.tdSN}>{index + 1}.</Text>
              <Text style={styles.tdPlanNo}>{plan.planNumber}</Text>
              <Text style={styles.tdPillar}>
                {getPillarDescription(plan.pillarCount, plan.pillarType)}
              </Text>
              <Text style={styles.tdTitle}>{plan.surveyTitle}</Text>
              <Text style={styles.tdLocality}>{plan.locality || "N/A"}</Text>
              <Text style={styles.tdSize}>{plan.deededArea}</Text>
              <Text style={styles.tdRemarks}>{getRemarks(plan)}</Text>
            </View>
          ))}
        </View>

        {/* Closing */}
        <View style={styles.closingSection}>
          <Text style={styles.closingText}>Yours faithfully,</Text>

          {/* Signature */}
          {submitter.signature ? (
            <Image style={styles.signatureImage} source={submitter.signature} />
          ) : (
            <View style={styles.signatureLineContainer}>
              <View style={styles.signatureLine} />
            </View>
          )}

          {/* Signer details */}
          <Text style={styles.signerName}>{fullName}</Text>
          <Text style={styles.signerTitle}>Registered Surveyor</Text>
          {submitter.surconRegNumber && (
            <Text style={{ fontSize: 9, marginTop: 2, color: "#444" }}>
              SURCON Reg: {submitter.surconRegNumber}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
