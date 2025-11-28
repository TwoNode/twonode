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

// Register fonts
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "/fonts/Helvetica.ttf" },
    { src: "/fonts/Helvetica-Bold.ttf", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },

  // ============ HEADER ============
  header: {
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#0A2D75",
    paddingBottom: 10,
  },
  logoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 80,
    height: 80,
  },
  companyInfo: {
    textAlign: "right",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2D75",
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.4,
  },

  // ============ TITLE ============
  titleSection: {
    backgroundColor: "#0A2D75",
    padding: 15,
    marginVertical: 20,
    borderRadius: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#ffffff",
    textAlign: "center",
    marginTop: 5,
  },

  // ============ REFERENCE ============
  referenceSection: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  referenceLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 3,
  },
  referenceValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0A2D75",
  },
  dateValue: {
    fontSize: 10,
    color: "#666",
    marginTop: 5,
  },

  // ============ DETAILS SECTION ============
  detailsSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0A2D75",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 10,
    paddingVertical: 5,
  },
  detailLabel: {
    width: "35%",
    fontSize: 10,
    color: "#666",
    fontWeight: "bold",
  },
  detailValue: {
    width: "65%",
    fontSize: 10,
    color: "#1f2937",
  },

  // ============ PAYMENT SECTION ============
  paymentSection: {
    backgroundColor: "#f0fdf4",
    padding: 15,
    marginVertical: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "bold",
  },
  paymentValue: {
    fontSize: 11,
    color: "#166534",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#16a34a",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#166534",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534",
  },

  // ============ STATUS BADGE ============
  statusBadge: {
    backgroundColor: "#16a34a",
    padding: 8,
    borderRadius: 3,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },

  // ============ FOOTER ============
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
    lineHeight: 1.4,
  },
  footerBold: {
    fontWeight: "bold",
    color: "#0A2D75",
  },

  // ============ WATERMARK ============
  watermark: {
    position: "absolute",
    top: "40%",
    left: "20%",
    fontSize: 60,
    color: "#f3f4f6",
    opacity: 0.3,
    transform: "rotate(-45deg)",
  },

  // ============ NOTES ============
  notesSection: {
    backgroundColor: "#fffbeb",
    padding: 12,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: "#78350f",
    lineHeight: 1.4,
  },
});

interface RevaReceiptPDFProps {
  property: any;
}

export function RevaReceiptPDF({ property }: RevaReceiptPDFProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isPaid = property?.paymentStatus?.toLowerCase() === "paid";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {isPaid && <Text style={styles.watermark}>PAID</Text>}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image style={styles.logo} source="/reva/reva_pdf_logo.png" />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>REVA</Text>
              <Text style={styles.companyAddress}>
                58 Kudirat Abiola Way{"\n"}
                Oregun, Ikeja, Lagos State{"\n"}
                +234 706 922 7677{"\n"}
                reva@twonodetechnologies.com
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Payment Receipt</Text>
          <Text style={styles.subtitle}>Due Diligence Service</Text>
        </View>

        {/* Reference */}
        <View style={styles.referenceSection}>
          <Text style={styles.referenceLabel}>Reference Number</Text>
          <Text style={styles.referenceValue}>{property?.reference}</Text>
          <Text style={styles.dateValue}>
            Date: {formatDate(property?.createdAt || new Date())}
          </Text>
        </View>

        {/* Payment Status */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            STATUS: {property?.paymentStatus?.toUpperCase() || "PENDING"}
          </Text>
        </View>

        {/* Client Information */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Client Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>
              {property?.requester ||
                `${property?.user?.firstName || ""} ${
                  property?.user?.lastName || ""
                }`.trim() ||
                "N/A"}
            </Text>
          </View>

          {property?.email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{property.email}</Text>
            </View>
          )}

          {property?.user?.email && !property?.email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{property.user.email}</Text>
            </View>
          )}
        </View>

        {/* Property Information */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Property Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{property?.address || "N/A"}</Text>
          </View>

          {property?.lga && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>LGA:</Text>
              <Text style={styles.detailValue}>{property.lga}</Text>
            </View>
          )}

          {property?.parcelId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Parcel ID:</Text>
              <Text style={styles.detailValue}>{property.parcelId}</Text>
            </View>
          )}

          {property?.lat && property?.lng && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Coordinates:</Text>
              <Text style={styles.detailValue}>
                {property.lat}, {property.lng}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Details */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service:</Text>
            <Text style={styles.paymentValue}>
              Real Estate Due Diligence Report
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service Type:</Text>
            <Text style={styles.paymentValue}>
              {property?.title || "Standard Due Diligence"}
            </Text>
          </View>

          {property?.paymentLink && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Reference:</Text>
              <Text style={styles.paymentValue}>
                {property.paymentLink.split("/").pop() || "N/A"}
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(property?.totalCost || 0)}
            </Text>
          </View>
        </View>

        {/* Comments/Notes */}
        {property?.comments && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes:</Text>
            <Text style={styles.notesText}>{property.comments}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a system-generated receipt and is valid without signature.
            {"\n"}
            For inquiries, please contact us at{" "}
            <Text style={styles.footerBold}>
              reva@twonodetechnologies.com
            </Text>{" "}
            or call <Text style={styles.footerBold}>+234 706 922 7677</Text>
            {"\n\n"}
            <Text style={styles.footerBold}>
              Real Estate Due Diligence just got intelligent
            </Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
