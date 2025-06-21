"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { PropertyWithoutUser } from "@/app/(projects)/reva/actions/dbActions";
import { toast } from "react-toastify";

// components/PropertyReportTemplate.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
  Image,
} from "@react-pdf/renderer";

export type ReportType = {
  // Front page
  centroid: string | null;

  // Page 1:  Title Investigation (Lands Bureau)
  titleStatus: string;
  titleDate: string | null;
  titleName: string | null;
  titleNumber: string;
  transactionFlow: string;
  // images?.transactionFlowImg
  rightToSellHolder: string;

  // Page 2:  Parcel Investigation (Office of the State Surveyor General)
  surveyPlanNumber: string;
  parcelPositionMatch: string;
  // images?.parcelCheck
  parcelStatus: string;
  implicationOfParcelStatus: string | null;
  commitmentStatus: string | null;
  implicationOfCommitmentStatus: string | null;
  parcelSetbacks: string;
  implicationOfParcelSetbacks: string | null;
  // images?.parcelChartingFree
  // images?.parcelChartingOffset
  surveyName: string;
  latestSurveyPlanNumber: string;
  dateOnSurveyPlan: string | null;
  historicalSurveys: string;

  // Page 3:  Parcel Investigation (Physical Planning)
  zoning: string;
  // images?.landUseCheck
  hasBuildingPlanApproval: boolean;
  buildingPlanNo: string;

  images: {
    transactionFlowImg: string;
    parcelCheck: string;
    parcelChartingFree: string;
    parcelChartingOffset: string;
    landUseCheck: string;
  };
};

// Register fonts (optional)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "/fonts/Helvetica.ttf" },
    { src: "/fonts/Helvetica-Bold.ttf", fontWeight: "bold" },
  ],
});

function ReportPDF({ property }: { property: any }) {
  const report: ReportType = property?.report || {};

  const styles = StyleSheet.create({
    // header: {
    //   position: "absolute",
    //   top: 20,
    //   left: 40,
    //   right: 40,
    //   textAlign: "center",
    //   fontSize: 12,
    //   fontWeight: "bold",
    //   color: "#0A2D75",
    // },
    headerImage: {
      position: "absolute",
      top: 5,
      right: 20,

      width: "40pt",
      height: "40pt",
      marginTop: 20,
      marginBottom: 120,
    },

    footer: {
      position: "absolute",
      bottom: 10,
      left: 0,
      // right: 40,
      flexDirection: "row",
      justifyContent: "center",
      paddingHorizontal: 50,
      width: "100%",
    },

    pageNumber: {
      color: "#00000050",
      fontSize: 8,
      textAlign: "right",
      justifySelf: "right",
      marginLeft: "auto",
    },

    textItalic: {
      fontStyle: "italic",
    },

    footerText: {
      color: "#002060",
      textAlign: "center",
      fontSize: 8,
      fontWeight: "bold",
      marginLeft: "auto",
    },

    frontPage: {
      padding: 72,
      fontSize: 11,
      fontFamily: "Helvetica",
    },
    page: {
      padding: 50,
      fontSize: 11,
      fontFamily: "Helvetica",
    },
    revaLogo: {
      width: "123.75pt",
      height: "123.75pt",
      marginTop: 20,
      marginBottom: 120,
    },
    frontPageHeading: {
      fontSize: 36,
      color: "#0A2D75",
      fontWeight: "bold",
      marginBottom: 30,
    },
    frontPageAddress: {
      fontSize: 14,
      color: "#4C483D",
      fontWeight: "normal",
      marginBottom: 30,
    },
    frontPageAddressText: {
      marginBottom: 30,
    },
    frontPagePoint: {
      fontSize: 12,
      color: "#4C483D",
      fontWeight: "normal",
      marginBottom: 50,
    },
    frontPageClient: {
      fontSize: 12,
      color: "#0A2D75",
      fontWeight: "bold",
      marginBottom: 10,
      textAlign: "right",
    },
    frontPageRef: {
      fontSize: 12,
      color: "#0A2D75",
      fontWeight: "bold",
      marginBottom: 30,
      textAlign: "right",
    },
    frontPageRefLabel: { fontWeight: "normal", fontSize: 12 },
    frontPageBlueBg: {
      color: "#fff",
      backgroundColor: "#002060",
      padding: "20px 20px",
      position: "absolute",
      bottom: 90,
      right: 0,
      left: 0,

      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      // alignItems: "center",

      fontSize: 10,
    },
    footerColumn: {
      flex: 1,
      // borderColor: "rgba(255, 255, 255, 0.06)",
      padding: 6,
      color: "white",
      fontSize: 10,
      gap: 4,

      borderWidth: 0.1,
      borderColor: "#ffffff10",
      borderStyle: "solid",
    },

    textSm: {
      fontSize: 10,
    },
    textBold: {
      fontWeight: "bold",
    },
    textRed: {
      color: "red",
    },

    //
    //
    //
    //
    //

    heading: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#0A2D75",

      borderBottomWidth: 0.3,
      borderBottomColor: "#04b104",
      borderBottomStyle: "solid",

      paddingBottom: 8,
      marginBottom: 12,
      width: "90%",
    },
    section: { marginBottom: 20 },
    subheading: {
      // fontSize: 14,
      // marginBottom: 6,
      // fontWeight: "bold",
      // textDecoration: "underline",
    },
    fieldRow: { marginBottom: 4 },
    title: {
      fontSize: 16,
      color: "#000000c0",
      marginVertical: 10,
    },
    //
    //
    //
    greyBg: {
      position: "relative",
      backgroundColor: "#e7e3e3",
      paddingTop: 13,
      paddingBottom: 13,
      paddingLeft: 35,
      paddingRight: 25,
      minHeight: 50,
      marginVertical: 5,
    },
    greyBgRedIcon: {
      position: "absolute",
      top: 12,
      left: 10,
      width: 18,
      height: 18,
      // border: "2px solid yellow",
    },
    greyHeader: {
      fontStyle: "italic",
      fontWeight: "light",
      textAlign: "justify",
      color: "#00000090",
      lineHeight: 1,
    },
    greyText: {
      fontStyle: "italic",
      fontWeight: "light",
      textAlign: "justify",
      color: "#00000050",
      lineHeight: 1,

      paddingLeft: 15,
    },
    fullWidthImage: {
      width: "95%",
      height: "auto",
      marginHorizontal: "auto",
      border: "2px solid red",
    },

    table: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      borderTop: "1px solid #ccc",
      borderLeft: "1px solid #ccc",
    },
    cellLeft: {
      width: "50%",
      padding: 4,
      borderBottom: "1px solid #ccc",
      borderRight: "1px solid #ccc",
      backgroundColor: "#f8f8f8",
    },
    cellRight: {
      width: "50%",
      padding: 4,
      borderBottom: "1px solid #ccc",
      borderRight: "1px solid #ccc",
    },
    italicNote: {
      fontStyle: "italic",
      fontSize: 10,
      marginTop: 6,
    },
    boldGreen: {
      color: "#4cdd3e",
      fontWeight: "bold",
    },
    //
    //
    //
    //
    //
    //
    //
    // Add these new styles:
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#0A2D75",
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#04b104",
      paddingBottom: 4,
    },
    highlightBox: {
      backgroundColor: "#f5f5f5",
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: "#0A2D75",
    },
    // highlightTitle: {
    //   fontSize: 12,
    //   fontWeight: "bold",
    //   marginBottom: 6,
    //   color: "#0A2D75",
    // },
    // highlightContent: {
    //   fontSize: 11,
    //   lineHeight: 1.4,
    // },
    transactionFlow: {
      marginTop: 16,
      marginBottom: 16,
    },
    flowItem: {
      marginBottom: 8,
      fontSize: 11,
    },
    flowBullet: {
      fontWeight: "bold",
      marginRight: 4,
    },
    landCustomsSection: {
      marginTop: 20,
      marginBottom: 16,
    },
    landCustomsTitle: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 8,
      color: "#0A2D75",
    },
    landCustomsItem: {
      marginBottom: 6,
      fontSize: 11,
    },
    tagsSection: {
      marginTop: 16,
      marginBottom: 16,
    },
    tagsTitle: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 8,
      color: "#0A2D75",
    },
    // tag: {
    // },
    tag: {
      //   display: "inline-block",
      flexDirection: "row", // Use flex instead of inline-block
      marginRight: 8,
      marginBottom: 8,
      padding: "2px 6px",
      backgroundColor: "#e7e3e3",
      borderRadius: 3,
      fontSize: 10,
    },
    // diagramTitle: {
    //   fontSize: 12,
    //   fontWeight: "bold",
    //   marginTop: 16,
    //   marginBottom: 8,
    //   color: "#0A2D75",
    // },
    quoteText: {
      fontStyle: "italic",
      fontSize: 11,
      marginTop: 12,
      marginBottom: 12,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: "#0A2D75",
    },
    footerNote: {
      position: "absolute",
      bottom: 40,
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 10,
      color: "#0A2D75",
      fontWeight: "bold",
    },

    //
    //
    //
    //
    //
    //
    //
    // Add these new styles
    numberedItem: {
      marginBottom: 8,
      flexDirection: "row",
    },
    number: {
      fontWeight: "bold",
      marginRight: 8,
    },
    content: {
      flex: 1,
    },
    highlightSection: {
      marginBottom: 20,
    },
    highlightTitle: {
      fontWeight: "bold",
      marginBottom: 8,
    },
    highlightContent: {
      marginLeft: 16,
    },
    nativeLandSection: {
      marginBottom: 20,
    },
    nativeLandTitle: {
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 8,
      textDecoration: "underline",
    },
    nativeLandItem: {
      marginBottom: 6,
      flexDirection: "row",
    },
    bullet: {
      marginRight: 8,
    },
    registrationTags: {
      marginBottom: 20,
    },
    registrationTitle: {
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 8,
      textDecoration: "underline",
    },
    transactionTags: {
      marginBottom: 20,
    },
    transactionTitle: {
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 8,
      textDecoration: "underline",
    },
    diagramSection: {
      marginBottom: 20,
    },
    diagramTitle: {
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 8,
    },
    diagramContent: {
      fontStyle: "italic",
      marginLeft: 16,
    },
    signatureLine: {
      borderTop: "1px solid black",
      width: 200,
      marginTop: 30,
    },
  });

  const Header = () => (
    <Image style={styles.headerImage} source={"/reva/reva_pdf_logo.png"} />
  );

  const Footer = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Real Estate
        <Text style={[styles.textRed, styles.textBold]}> Due Diligence </Text>
        just got intelligent
      </Text>

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );

  const HeaderAndFooter = () => (
    <>
      <Header />
      <Footer />
    </>
  );

  return (
    <Document>
      <Page size="LETTER" orientation="portrait" style={styles.frontPage}>
        <Image style={styles.revaLogo} source={"/reva/reva_pdf_logo.png"} />
        <Text style={styles.frontPageHeading}>Due Diligence Report</Text>

        <View style={styles.section}>
          <Text style={styles.frontPageAddress}>
            <Text style={styles.frontPageAddressText}>{property?.address}</Text>
            <Text style={styles.frontPageAddressText}> {property?.lga} </Text>
          </Text>

          <Text style={styles.frontPagePoint}>
            {property?.centroid ?? `Centroid - --`}
          </Text>

          <Text style={styles.frontPageClient}>
            <Text style={styles.frontPageRefLabel}>Client: </Text>{" "}
            {property?.user?.firstName || property?.user?.lastName}
          </Text>

          <Text style={styles.frontPageRef}>
            <Text style={styles.frontPageRefLabel}>Reference:</Text>{" "}
            {property?.reference}
          </Text>
        </View>

        <View style={styles.frontPageBlueBg}>
          <View style={styles.footerColumn}>
            <Text>58 Kudirat Abiola Way</Text>
            <Text>Oregun, Ikeja, Lagos State</Text>
          </View>
          <View style={styles.footerColumn}>
            <Text>+2347 069 227 677</Text>
            <Text>+2349 160 002 740</Text>
          </View>
          <View style={styles.footerColumn}>
            <Text>reva@twonodetechnologies.com</Text>
          </View>
        </View>
      </Page>

      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <HeaderAndFooter />

        {/* Title Investigation Section */}
        <Text style={styles.heading}>Title Investigation (Lands Bureau)</Text>

        <View style={styles.numberedItem}>
          <Text style={styles.number}>1.</Text>
          <Text style={styles.content}>
            The property currently has an existing title dated{" "}
            <Text style={styles.textBold}>{report.titleDate || "--"}</Text>{" "}
            between{" "}
            <Text style={styles.textBold}>{report.titleName || "--"}</Text>{" "}
            which{" "}
            <Text style={styles.textBold}>
              {report.titleStatus === "duly"
                ? "is a duly registered instrument"
                : "is not a duly registered instrument"}
            </Text>{" "}
            at the registry of deeds, lands bureau Lagos State as{" "}
            <Text style={styles.textBold}>{report.titleNumber || "--"}</Text>.
          </Text>
        </View>

        {/* Highlights Section */}
        <View style={styles.highlightSection}>
          <Text style={styles.highlightTitle}>Highlights:</Text>
          <View style={styles.highlightContent}>
            <View style={styles.numberedItem}>
              <Text style={styles.number}>1.</Text>
              <Text style={styles.content}>
                Transaction Flow Summary:{" "}
                <Text style={styles.textBold}>
                  {report.transactionFlow || "--"}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Native Land and Customs Section */}
        <View style={styles.nativeLandSection}>
          <Text style={styles.nativeLandTitle}>
            Yanuba Native Land and customs
          </Text>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}>-</Text>
            <Text>Alhaji Sabu Dabiri</Text>
          </View>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}> </Text>
            <Text>Ajaxa family</Text>
          </View>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}> </Text>
            <Text>No 71 Page 71 Volume 1839</Text>
          </View>

          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}>-</Text>
            <Text>Alhaji Mulbeen Olatunmbi</Text>
          </View>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}> </Text>
            <Text>No 2 Page 2 Volume 2127</Text>
          </View>

          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}>-</Text>
            <Text>Mr. Augustine Afaga</Text>
          </View>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}> </Text>
            <Text>Mr. Robinson Anunabi</Text>
          </View>
        </View>

        {/* Registration Flow Tags */}
        <View style={styles.registrationTags}>
          <Text style={styles.registrationTitle}>Registration Flow Tags</Text>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}>-</Text>
            <Text>Registered deed</Text>
          </View>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}>-</Text>
            <Text>Non-registered deed</Text>
          </View>
        </View>

        {/* Transaction Flow Tags */}
        <View style={styles.transactionTags}>
          <Text style={styles.transactionTitle}>Transaction Flow Tags</Text>
          <View style={styles.nativeLandItem}>
            <Text style={styles.bullet}>-</Text>
            <Text>Legrande properties development company limited</Text>
          </View>
        </View>

        {/* Diagram Section */}
        <View style={styles.diagramSection}>
          <Text style={styles.diagramTitle}>
            Diagram 1.0 - Transaction Flow at Property Parcel
          </Text>
          <View style={styles.diagramContent}>
            <Text style={styles.textItalic}>
              "The question arises: Who holds the right to sell the development?{" "}
              <Text style={styles.textBold}>
                {report.rightToSellHolder || "--"}
              </Text>
              "
            </Text>
          </View>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerText}>
          Real Estate Due Diligence just got intelligent
        </Text>
        <Text style={styles.pageNumber}>Page 1</Text>
      </Page>

      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <HeaderAndFooter />

        {/* Title Investigation Section */}
        <Text style={styles.sectionTitle}>
          Title Investigation (Lands Bureau)
        </Text>

        {/* Main Property Title Information */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Property Title Information</Text>
          <Text style={styles.highlightContent}>
            The property currently has an existing title dated{" "}
            <Text style={{ fontWeight: "bold" }}>
              {report.titleDate || "--"}
            </Text>{" "}
            between{" "}
            <Text style={{ fontWeight: "bold" }}>
              {report.titleName || "--"}
            </Text>{" "}
            which{" "}
            <Text style={{ fontWeight: "bold" }}>
              {report.titleStatus === "duly"
                ? "is a duly registered instrument"
                : "is not a duly registered instrument"}
            </Text>{" "}
            at the registry of deeds, lands bureau Lagos State as{" "}
            <Text style={{ fontWeight: "bold" }}>
              {report.titleNumber || "--"}
            </Text>
            .
          </Text>
        </View>

        {/* Transaction Flow Summary */}
        <View style={styles.transactionFlow}>
          <Text style={styles.highlightTitle}>Transaction Flow Summary:</Text>
          {report.transactionFlow ? (
            report.transactionFlow.split("\n").map((item, index) => (
              <Text key={index} style={styles.flowItem}>
                <Text style={styles.flowBullet}>•</Text> {item}
              </Text>
            ))
          ) : (
            <Text style={styles.flowItem}>
              The property currently has{" "}
              <Text style={[styles.textBold, styles.textRed]}> NO </Text>{" "}
              existing title transaction.
            </Text>
          )}
        </View>

        {/* Yanuba Native Land and Customs Section */}
        <View style={styles.landCustomsSection}>
          <Text style={styles.landCustomsTitle}>
            Yanuba Native Land and Customs
          </Text>
          <Text style={styles.landCustomsItem}>
            • Alhaji Sabu Dabiri Ajasa family
          </Text>
          <Text style={{ ...styles.landCustomsItem, marginLeft: 12 }}>
            No 71 Page 71 Volume 1839
          </Text>
          <Text style={styles.landCustomsItem}>• Alhaji Mulbeen Olatunmbi</Text>
          <Text style={{ ...styles.landCustomsItem, marginLeft: 12 }}>
            No 2 Page 2 Volume 2127
          </Text>
          <Text style={styles.landCustomsItem}>• Mr. Augustine Afaga</Text>
          <Text style={styles.landCustomsItem}>• Mr. Robinson Anunabi</Text>
        </View>

        {/* Registration Flow Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsTitle}>Registration Flow Tags</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <View style={styles.tag}>
              <Text>• Registered deed</Text>
            </View>
            <View style={styles.tag}>
              <Text>• Non-registered deed</Text>
            </View>
          </View>
        </View>

        {/* Transaction Flow Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsTitle}>Transaction Flow Tags</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <View style={styles.tag}>
              <Text>• Legrande properties development company limited</Text>
            </View>
          </View>
        </View>

        {/* Diagram Section */}
        <View>
          <Text style={styles.diagramTitle}>
            Diagram 1.0 - Transaction Flow at Property Parcel
          </Text>
          {/* Placeholder for diagram image */}
          <View
            style={{
              height: 150,
              backgroundColor: "#f5f5f5",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text>[Transaction Flow Diagram]</Text>
          </View>
        </View>

        {/* Quote Section */}
        <View style={styles.quoteText}>
          <Text>
            "The question arises: Who holds the right to sell the development?{" "}
            <Text style={{ fontWeight: "bold" }}>
              {report.rightToSellHolder || "--"}
            </Text>
            "
          </Text>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Real Estate Due Diligence just got intelligent
        </Text>
      </Page>

      <Page
        size="LETTER"
        id="titleInvestigation"
        orientation="portrait"
        style={styles.page}
      >
        <HeaderAndFooter />
        <Text style={styles.heading}>Title Investigation (Lands Bureau)</Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={styles.greyHeader}>
            {"The property currently has an existing title dated "}
            <Text style={[styles.textBold, styles.textRed]}>
              {property?.titleDate ?? "--"}
            </Text>
            {" between "}
            <Text style={[styles.textBold, styles.textRed]}>
              {property?.titleName ?? "--"}{" "}
            </Text>{" "}
            which $Title Status at the registry of deeds, lands bureau Lagos
            State as $Title Number.
            <Text style={[styles.textBold, styles.textRed]}></Text>
            at the registry of deeds, lands bureau Lagos State as Number 33 Page
            33 in Volume 2580.
          </Text>
        </View>

        <Text style={styles.title}>Highlights.</Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={styles.greyHeader}>
            The property currently has an existing title dated $Date between
            $Title Name which $Title Status at the registry of deeds, lands
            bureau Lagos State as $Title Number.
          </Text>
        </View>

        <Image
          style={styles.fullWidthImage}
          source={"/reva/reva_pdf_logo.png"}
        />

        <View style={styles.greyBg} wrap={false}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={styles.greyHeader}>
            <Text style={[styles.textBold]}>
              “The question arises: Who holds the right to sell the development?{" "}
            </Text>
            According to the Property Development Agreement, No. 33, Page 33,
            Volume 2580, specifically on Page 13, Section 10, Subsection 1,
            Paragraphs 1 and 2, Legrande Properties Development Company Limited
            is entitled to 5 units, while Mr. Augustine Ataga is entitled to 2
            units. Further clarification is provided in Section 13.0 on Page 14
          </Text>
        </View>
      </Page>

      <Page
        size="LETTER"
        id="parcelInvestigationSurveyor"
        orientation="portrait"
        style={styles.page}
      >
        <HeaderAndFooter />

        <Text style={styles.heading}>
          Parcel Investigation (Office of the State Surveyor General)
        </Text>

        {/* Section 1: Parcel Location Check */}
        <Text style={styles.title}>Parcel Location Check</Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={styles.greyHeader}>
            Parcel location using the following Reference:{" "}
          </Text>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.cellLeft}>
              <Text>Minna_UTM_Zone_31N</Text>
            </View>
            <View style={styles.cellRight}>
              <Text>Geographic Coordinate System: GCS_Minna</Text>
            </View>
            <View style={styles.cellLeft}>
              <Text>Projection: Transverse_Mercator</Text>
            </View>
            <View style={styles.cellRight}>
              <Text>Angular Unit: Degree (0.0174532925199433)</Text>
            </View>
            <View style={styles.cellLeft}>
              <Text>False_Easting: 500000.0</Text>
            </View>
            <View style={styles.cellRight}>
              <Text>Prime Meridian: Greenwich (0.0)</Text>
            </View>
            <View style={styles.cellLeft}>
              <Text>Central_Meridian: 3.0</Text>
            </View>
            <View style={styles.cellRight}>
              <Text>Datum: D_Minna</Text>
            </View>
            <View style={styles.cellLeft}>
              <Text>Scale_Factor: 0.9996</Text>
            </View>
            <View style={styles.cellRight}>
              <Text>Spheroid: Clarke_1880_RGS</Text>
            </View>
            <View style={styles.cellLeft}>
              <Text>Linear Unit: Meter (1.0)</Text>
            </View>
            <View style={styles.cellRight}>
              <Text>Semimajor Axis: 6378249.145</Text>
            </View>
            <View style={styles.cellLeft}></View>
            <View style={styles.cellRight}>
              <Text>Semiminor Axis: 6356514.869549775</Text>
            </View>
            <View style={styles.cellLeft}></View>
            <View style={styles.cellRight}>
              <Text>Inverse Flattening: 293.465</Text>
            </View>
          </View>

          <Text style={styles.italicNote}>
            Please see Figure 1.0 below for the Parcel Overlay on Ortho
            Rectified Imagery
          </Text>
        </View>

        <Text style={styles.title}>
          {" "}
          Parcel Position Check on Lagos State Framework (Vector 04)
        </Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={[styles.greyHeader]}>
            The
            <Text style={styles.boldGreen}>$Survey Plan No.</Text>
            <Text> has a </Text>
            <Text style={styles.boldGreen}>$Parcel Position Match (%)</Text>
            position match with the Lagos State Framework(Vector 04)
          </Text>

          <Text style={styles.greyText}>
            Please see Figure 1.0 below for the Parcel Overlay on Orthorectified
            Imagery
          </Text>
        </View>

        {/* Figure 1.0 Parcel Check Image */}

        <Text style={styles.title}>Parcel Status Check - Charting Report </Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={[styles.greyHeader]}>
            Based on the Above Parcel Check The Charting report Reveals That;
          </Text>

          <Text style={styles.greyText}>
            $Parcel Status Check -- he property is free from any known
            Government Acquisition (Please see figure 2.0)
          </Text>

          <Text style={styles.greyText}>
            $Parcel on Setbacks -- No Commitment
          </Text>
          <Text style={styles.greyText}>
            $Parcel on Setbacks -- Falls partly within the offset of the Open
            Canal (Please see figure 3.0)
          </Text>
        </View>

        {/* Parcel Charting Image */}

        <Text style={styles.title}>Historical Survey Records</Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={[styles.greyHeader]}>
            The most recent lodged survey plan for the property is Survey Plan
            No. $Most recent lodged survey plan no., archived at the office of
            the State Surveyor General on $Date on Survey plan. This survey was
            registered under $Name on Survey.{" "}
          </Text>

          <Text style={styles.greyHeader}>
            Prior to this, the following survey plans covering the same area
            were recorded in descending order of date:
          </Text>

          <Text style={styles.greyText}>$Historical Survey Records</Text>
          <Text style={styles.greyText}>
            1.Survey Plan No. ABC/0000/001/2007/LA – December 20, 2007 –
            Registered to Mr. Adebayo Abiodun
          </Text>
          <Text style={styles.greyText}>
            2.Survey Plan No. CDE/1111/002/1998/LA – February 14, 1998 –
            Registered to Mr. Junior Olubode
          </Text>
          <Text style={styles.greyText}>
            3.Survey Plan No. FT/LA/002/78 – January 2, 1978 – Registered to
            Mrs. Adebisi Olukoya.
          </Text>
        </View>

        {/* <>
          <Text style={styles1.referenceItem}>
            <Text style={styles1.italic}>Minna_UTM_Zone_31N</Text>
          </Text>
          <Text style={styles1.referenceItem}>
            Projection: Transverse_Mercator
          </Text>
          <Text style={styles1.referenceItem}>False_Easting: 500000.0</Text>
          <Text style={styles1.referenceItem}>Central_Meridian: 3.0</Text>
          <Text style={styles1.referenceItem}>Scale_Factor: 0.99%</Text>
          <Text style={styles1.referenceItem}>Linear Unit: Meter (1.0)</Text>

          <Text style={styles1.sectionTitle}>
            Geographic Coordinate System:
          </Text>
          <Text style={styles1.referenceItem}>GCS_Minna</Text>
          <Text style={styles1.referenceItem}>
            Angular Unit: Degree (0.0174532925199433)
          </Text>
          <Text style={styles1.referenceItem}>
            Prime Meridian: Greenwich (0.0)
          </Text>
          <Text style={styles1.referenceItem}>Datum: D_Minna</Text>
          <Text style={styles1.referenceItem}>Spheroid: Clarke_1880_RGS</Text>
          <Text style={styles1.referenceItem}>Semimajor Axis: 6378249.145</Text>
          <Text style={styles1.referenceItem}>
            Semiminor Axis: 6356514.869549775
          </Text>
          <Text style={styles1.referenceItem}>Inverse Flattening: 293.465</Text>

          <View style={styles1.figureContainer}>
            <Text style={styles1.figureTitle}>
              Figure 1.0: Parcel Overlay on Ortho Rectified Imagery
            </Text>
            <View
              style={{
                width: 400,
                height: 250,
                backgroundColor: "#e0e0e0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text>Parcel Overlay Image Would Appear Here</Text>
            </View>
          </View>

          <Text style={{ ...styles1.sectionTitle, marginTop: 30 }}>
            Parcel Position Check on Lagos State Framework (Vector 04)
          </Text>

          <Text style={styles1.referenceItem}>
            The <Text style={styles1.bold}>Survey Plan No.</Text> has a{" "}
            <Text style={styles1.bold}>Parcel Position Match (%)</Text> position
            match with the Lagos State Framework (Vector 04)
          </Text>

          <View style={styles1.figureContainer}>
            <Text style={styles1.figureTitle}>
              Figure 1.0: Parcel Overlay on Orthorectified Imagery
            </Text>

            <View
              style={{
                width: 400,
                height: 250,
                backgroundColor: "#e0e0e0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text>Parcel Overlay Image Would Appear Here</Text>
            </View>
          </View>

          <View style={styles1.table}>
            <View style={[styles1.tableRow, styles1.headerCell]}>
              <Text style={[styles1.tableCell, { width: "30%" }]}>
                Parameter
              </Text>
              <Text style={[styles1.tableCell, { width: "70%" }]}>Value</Text>
            </View>
            <View style={styles1.tableRow}>
              <Text style={[styles1.tableCell, { width: "30%" }]}>
                Coordinate System
              </Text>
              <Text style={[styles1.tableCell, { width: "70%" }]}>
                Minna_UTM_Zone_31N
              </Text>
            </View>
            <View style={styles1.tableRow}>
              <Text style={[styles1.tableCell, { width: "30%" }]}>
                Projection
              </Text>
              <Text style={[styles1.tableCell, { width: "70%" }]}>
                Transverse_Mercator
              </Text>
            </View>
            <View style={styles1.tableRow}>
              <Text style={[styles1.tableCell, { width: "30%" }]}>Datum</Text>
              <Text style={[styles1.tableCell, { width: "70%" }]}>D_Minna</Text>
            </View>
          </View>
        </> */}
      </Page>

      <Page
        size="LETTER"
        id="parcelInvestigationPhysical"
        orientation="portrait"
        style={styles.page}
      >
        <HeaderAndFooter />

        <Text style={styles.heading}>
          Parcel Investigation (Physical Planning)
        </Text>

        <View style={styles.greyBg}>
          <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

          <Text style={styles.greyHeader}>
            The Parcel falls within the{" "}
            <Text style={[styles.textBold, styles.textRed]}>
              {property?.zoning}
            </Text>
          </Text>
        </View>

        {/* Figure 4.0 Parcel LandUse Check image */}
        <Image
          style={styles.fullWidthImage}
          source={report?.images?.landUseCheck}
        />

        <View wrap={false}>
          <Text style={styles.title}>Building Plan Approval</Text>

          <View style={styles.greyBg}>
            <Image style={styles.greyBgRedIcon} source={"/reva/redIcon.png"} />

            <Text style={styles.greyHeader}>
              Any Building Plan Approval –{" "}
              <Text style={[styles.textBold, styles.textRed]}>
                $Building Plan Approval{" "}
              </Text>
            </Text>

            <Text style={styles.greyHeader}>
              Building Plan Approval Number -{" "}
              <Text style={[styles.textBold, styles.textRed]}>
                $Building Plan No{" "}
              </Text>
            </Text>

            <Text style={styles.greyHeader}>
              Any Building Plan Approval – YES
            </Text>

            <Text style={styles.greyHeader}>
              Building Plan Approval Number - ABC123DEF456
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export const PDFDownloadButton = ({ property }: { property: any }) => (
  <PDFDownloadLink
    document={<ReportPDF property={property} />}
    fileName={`Due_Diligence_Report_${property?.reference}.pdf`}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    {({ loading, error }) => {
      if (error) {
        console.error("Error generating PDF:", error);
        // toast.error("Failed to generate the report. Please try again.");
        return "Error Generating Report";
      }
      return loading ? "Generating Report..." : "Download PDF Report";
    }}
  </PDFDownloadLink>
);

const UserRequestDataView = ({ property }: { property: any }) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const toggleDeleteModal = () => {
    setOpenDeleteModal((prev) => !prev);
  };

  return (
    <>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {property?.title || "Untitled Request"}
            </h1>

            <p className="text-sm text-muted-foreground">
              REF: {property?.reference}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {property?.status && <Badge>{property.status}</Badge>}
            {property?.paymentStatus && (
              <Badge variant="secondary">{property.paymentStatus}</Badge>
            )}
            {property?.report?.isApproved && (
              <Badge className="w-full md:w-auto px-6 text-white bg-green-500">
                {"Approved"}
              </Badge>
            )}

            <Button
              variant="outline"
              disabled={
                property?.status !== "Completed" &&
                property?.status !== "Available"
              }
              className="max-sm:w-full rounded-lg"
              onClick={() => {
                if (property?.report?.directFileLink) {
                  const link = document.createElement("a");
                  link.href = property.report.directFileLink;
                  link.download = `${property?.title ?? "report"}.pdf`; // You can customize the file name
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  console.error("No file link available to download");
                  toast.error("Report will be ready soon.");
                }
              }}
            >
              Download Report
            </Button>

            <PDFDownloadButton property={property} />
          </div>
        </div>

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Info label="Address" value={property?.address} />
            <Info label="LGA" value={property?.lga} />
            <Info label="Parcel ID" value={property?.parcelId || "-"} />
            <Info
              label="Created"
              value={
                property?.createdAt
                  ? new Date(property.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"
              }
            />
            <Info
              label="Last Updated"
              value={
                property?.updatedAt
                  ? new Date(property.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"
              }
            />
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader>
            <CardTitle>Financial</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Info
              label="Total Cost"
              value={`₦${property?.totalCost?.toLocaleString()}`}
              bold
            />
            <Info
              label="Payment Status"
              value={property?.paymentStatus || "-"}
              color={
                property?.paymentStatus === "Paid"
                  ? "text-green-600"
                  : "text-red-600"
              }
            />
            {property?.paymentLink && (
              <div className="col-span-2">
                <Button variant="link" size="sm" asChild>
                  <a
                    href={property.paymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Payment
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supporting Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Supporting Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(property?.documentsUrls) &&
            property.documentsUrls.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {(property.documentsUrls as string[])?.map((url, idx) => (
                  <li key={idx}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Document {idx + 1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  No documents uploaded
                </p>
                {/* <Button className="mt-4">Upload Document</Button> */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={property?.comments || "No remarks"}
              readOnly
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t pt-6 flex-wrap max-sm:justify-center gap-4">
          <Button variant="outline" className="max-sm:w-full rounded-lg">
            Back to All Requests
          </Button>

          <div className="flex gap-4">
            {/* <Button
              variant="destructive"
              className="max-sm:w-full rounded-lg"
              onClick={toggleDeleteModal}
            >
              Delete Request
            </Button> */}
            <Button className="max-sm:w-full rounded-lg">
              Download Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deleting this Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this due diligence request? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={toggleDeleteModal}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={toggleDeleteModal}>
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </>
  );
};

const Info = ({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p
      className={`text-sm ${bold ? "font-semibold" : ""} ${
        color || "text-gray-800"
      }`}
    >
      {value}
    </p>
  </div>
);

export default UserRequestDataView;
