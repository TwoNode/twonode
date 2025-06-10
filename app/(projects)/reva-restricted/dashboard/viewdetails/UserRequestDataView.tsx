"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

// Register fonts (optional)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "/fonts/Helvetica.ttf" },
    { src: "/fonts/Helvetica-Bold.ttf", fontWeight: "bold" },
  ],
});

function ReportPDF({ property }: { property: any }) {
  const report = property?.report || {};

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
    // footer: {
    //   position: "absolute",
    //   bottom: 20,
    //   left: 40,
    //   right: 40,
    //   backgroundColor: "#002060",
    //   flexDirection: "row",
    //   justifyContent: "space-between",
    //   padding: 10,
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
    footerText: {
      position: "absolute",
      top: 5,
      right: 20,
      textAlign: "center",
      fontSize: 8,
      fontWeight: "bold",
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

    //
    //
    //
    //
    //

    heading: {
      fontSize: 16,
      fontWeight: "bold",
      // marginBottom: 10,
      color: "#0A2D75",
      border: "1px solid green",
      borderWidth: 0.5,
      borderColor: "green",
      paddingHorizontal: 3,
      paddingTop: 0,
      borderBottom: 6,
    },
    section: { marginBottom: 20 },
    subheading: {
      // fontSize: 14,
      // marginBottom: 6,
      // fontWeight: "bold",
      // textDecoration: "underline",
    },
    fieldRow: { marginBottom: 4 },
    //
    //
    //
    greyBg: {
      backgroundColor: "#ccc",
      position: "relative",
      paddingLeft: 50,
    },
    greyBgRedIcon: {},
  });

  return (
    <Document>
      <Page size="LETTER" orientation="portrait" style={styles.frontPage}>
        <Image style={styles.revaLogo} source={"/reva/reva_pdf_logo.png"} />
        <Text style={styles.frontPageHeading}>Due Diligence Report</Text>

        <View style={styles.section}>
          <Text style={styles.frontPageAddress}>
            <Text style={styles.frontPageAddressText}>
              {property?.address} -- {property?.address}
            </Text>
            <Text style={styles.frontPageAddressText}> {property?.lga} </Text>
          </Text>

          <Text style={styles.frontPagePoint}>
            Centroid - 6°34'05.7"N 3°22'37.4"E
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
        <Image style={styles.headerImage} source={"/reva/reva_pdf_logo.png"} />
        <Text style={styles.heading}>Title Investigation (Lands Bureau)</Text>

        <View style={styles.greyBg}>
          <Image
            style={styles.headerImage}
            source={"/reva/reva_pdf_logo.png"}
          />

          <Text style={styles.subheading}>
            The property currently has an existing title dated $Date between
            $Title Name which $Title Status at the registry of deeds, lands
            bureau Lagos State as $Title Number.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Reference:</Text>{" "}
            {property?.reference}
          </Text>

          <Text style={styles.fieldRow}>
            Highlights.
            <></>
            Transaction Flow Summary: 1.Alhaji Saibu Dabiri Ajasa family sells a
            parcel of land to Alhaji Muibeen Olatummbi.<></>
            2.Alhaji Muibeen Olatummbi sells the same parcel to Mr. Robinson
            Anunobi.<></>
            3.Mr. Robinson Anunobi then transfers the land to Mr. Augustine
            Ataga.<></>
            4. Later, Mr. Augustine Ataga purchases an additional piece of land
            from Alhaji Muibeen Olatummbi,<></>
            the same individual who originally sold to Mr. Robinson Anunobi.
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>LGA:</Text> {property?.lga}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Title Investigation (Lands Bureau)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Status:</Text>{" "}
            {report.titleStatus}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Number:</Text>{" "}
            {report.titleNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Right To Sell Holder:</Text>{" "}
            {report.rightToSellHolder}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
            {report.transactionFlow}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Parcel Investigation (Surveyor General)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Position Match:</Text>{" "}
            {report.parcelPositionMatch}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Status:</Text>{" "}
            {report.parcelStatus}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Survey Details</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Plan Number:</Text>{" "}
            {report.surveyPlanNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Name:</Text>{" "}
            {report.surveyName}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Historical Surveys:</Text>{" "}
            {report.historicalSurveys}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Physical Planning</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Zoning:</Text>{" "}
            {report.zoning}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Setbacks Info:</Text>{" "}
            {report.setbacksInfo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Building Plan Approval</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Approval Available:</Text>{" "}
            {report.hasBuildingPlanApproval ? "Yes" : "No"}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Building Plan Number:</Text>{" "}
            {report.buildingPlanNo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Images (names only)</Text>
          {report.images && (
            <>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
                {report.images.transactionFlowImg?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Parcel Check:</Text>{" "}
                {report.images.parcelCheck?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Free:
                </Text>{" "}
                {report.images.parcelChartingFree?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Offset:
                </Text>{" "}
                {report.images.parcelChartingOffset?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Land Use Check:</Text>{" "}
                {report.images.landUseCheck?.name || "N/A"}
              </Text>
            </>
          )}
        </View>
      </Page>

      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <Image style={styles.headerImage} source={"/reva/reva_pdf_logo.png"} />
        <Text style={styles.heading}>
          Parcel Investigation (Office of the State Surveyor General)
        </Text>

        <View style={styles.section}>
          <Text style={styles.subheading}>Client & Property Info</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Reference:</Text>{" "}
            {property?.reference}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Address:</Text>{" "}
            {property?.address}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>LGA:</Text> {property?.lga}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Title Investigation (Lands Bureau)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Status:</Text>{" "}
            {report.titleStatus}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Number:</Text>{" "}
            {report.titleNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Right To Sell Holder:</Text>{" "}
            {report.rightToSellHolder}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
            {report.transactionFlow}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Parcel Investigation (Surveyor General)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Position Match:</Text>{" "}
            {report.parcelPositionMatch}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Status:</Text>{" "}
            {report.parcelStatus}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Survey Details</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Plan Number:</Text>{" "}
            {report.surveyPlanNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Name:</Text>{" "}
            {report.surveyName}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Historical Surveys:</Text>{" "}
            {report.historicalSurveys}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Physical Planning</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Zoning:</Text>{" "}
            {report.zoning}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Setbacks Info:</Text>{" "}
            {report.setbacksInfo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Building Plan Approval</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Approval Available:</Text>{" "}
            {report.hasBuildingPlanApproval ? "Yes" : "No"}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Building Plan Number:</Text>{" "}
            {report.buildingPlanNo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Images (names only)</Text>
          {report.images && (
            <>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
                {report.images.transactionFlowImg?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Parcel Check:</Text>{" "}
                {report.images.parcelCheck?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Free:
                </Text>{" "}
                {report.images.parcelChartingFree?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Offset:
                </Text>{" "}
                {report.images.parcelChartingOffset?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Land Use Check:</Text>{" "}
                {report.images.landUseCheck?.name || "N/A"}
              </Text>
            </>
          )}
        </View>
      </Page>

      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <Image style={styles.headerImage} source={"/reva/reva_pdf_logo.png"} />
        <Text style={styles.heading}>
          Parcel Investigation (Physical Planning)
        </Text>

        <View style={styles.section}>
          <Text style={styles.subheading}>Client & Property Info</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Reference:</Text>{" "}
            {property?.reference}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Address:</Text>{" "}
            {property?.address}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>LGA:</Text> {property?.lga}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Title Investigation (Lands Bureau)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Status:</Text>{" "}
            {report.titleStatus}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Number:</Text>{" "}
            {report.titleNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Right To Sell Holder:</Text>{" "}
            {report.rightToSellHolder}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
            {report.transactionFlow}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Parcel Investigation (Surveyor General)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Position Match:</Text>{" "}
            {report.parcelPositionMatch}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Status:</Text>{" "}
            {report.parcelStatus}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Survey Details</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Plan Number:</Text>{" "}
            {report.surveyPlanNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Name:</Text>{" "}
            {report.surveyName}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Historical Surveys:</Text>{" "}
            {report.historicalSurveys}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Physical Planning</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Zoning:</Text>{" "}
            {report.zoning}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Setbacks Info:</Text>{" "}
            {report.setbacksInfo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Building Plan Approval</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Approval Available:</Text>{" "}
            {report.hasBuildingPlanApproval ? "Yes" : "No"}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Building Plan Number:</Text>{" "}
            {report.buildingPlanNo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Images (names only)</Text>
          {report.images && (
            <>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
                {report.images.transactionFlowImg?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Parcel Check:</Text>{" "}
                {report.images.parcelCheck?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Free:
                </Text>{" "}
                {report.images.parcelChartingFree?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Offset:
                </Text>{" "}
                {report.images.parcelChartingOffset?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Land Use Check:</Text>{" "}
                {report.images.landUseCheck?.name || "N/A"}
              </Text>
            </>
          )}
        </View>
      </Page>

      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <Image style={styles.headerImage} source={"/reva/reva_pdf_logo.png"} />
        <Text style={styles.heading}>Due Diligence Report</Text>

        <View style={styles.section}>
          <Text style={styles.subheading}>Client & Property Info</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Reference:</Text>{" "}
            {property?.reference}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Address:</Text>{" "}
            {property?.address}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>LGA:</Text> {property?.lga}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Title Investigation (Lands Bureau)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Status:</Text>{" "}
            {report.titleStatus}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Title Number:</Text>{" "}
            {report.titleNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Right To Sell Holder:</Text>{" "}
            {report.rightToSellHolder}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
            {report.transactionFlow}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>
            Parcel Investigation (Surveyor General)
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Position Match:</Text>{" "}
            {report.parcelPositionMatch}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Parcel Status:</Text>{" "}
            {report.parcelStatus}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Survey Details</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Plan Number:</Text>{" "}
            {report.surveyPlanNumber}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Survey Name:</Text>{" "}
            {report.surveyName}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Historical Surveys:</Text>{" "}
            {report.historicalSurveys}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Physical Planning</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Zoning:</Text>{" "}
            {report.zoning}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Setbacks Info:</Text>{" "}
            {report.setbacksInfo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Building Plan Approval</Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Approval Available:</Text>{" "}
            {report.hasBuildingPlanApproval ? "Yes" : "No"}
          </Text>
          <Text style={styles.fieldRow}>
            <Text style={styles.frontPageRefLabel}>Building Plan Number:</Text>{" "}
            {report.buildingPlanNo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Images (names only)</Text>
          {report.images && (
            <>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Transaction Flow:</Text>{" "}
                {report.images.transactionFlowImg?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Parcel Check:</Text>{" "}
                {report.images.parcelCheck?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Free:
                </Text>{" "}
                {report.images.parcelChartingFree?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>
                  Parcel Charting Offset:
                </Text>{" "}
                {report.images.parcelChartingOffset?.name || "N/A"}
              </Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.frontPageRefLabel}>Land Use Check:</Text>{" "}
                {report.images.landUseCheck?.name || "N/A"}
              </Text>
            </>
          )}
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
              value={`₦${property?.totalCost.toLocaleString()}`}
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
