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
import { revaApi } from "@/reva/apiClient";

/** Report images are private files: load them through the file gateway (absolute, because the PDF renderer fetches them itself). */
const fileSrc = (url: string) =>
  typeof window === "undefined"
    ? url
    : new URL(revaApi.files.linkFor(url), window.location.origin).toString();

// Register fonts
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "/fonts/Helvetica.ttf" },
    { src: "/fonts/Helvetica-Bold.ttf", fontWeight: "bold" },
  ],
});

export type ReportType = {
  centroid: string | null;
  titleStatus: string;
  titleDate: string | null;
  titleName: string | null;
  titleNumber: string;
  rightToSellHolder: string;
  transactionFlow: string;
  parcelPositionMatch: string;
  parcelStatus: string;
  implicationOfParcelStatus: string | null;
  commitmentStatus: string | null;
  implicationOfCommitmentStatus: string | null;
  setbacksInfo: string;
  implicationOfsetbacksInfo: string | null;
  surveyPlanNumber: string;
  surveyName: string;
  dateOnSurveyPlan: string | null;
  historicalSurveys: string;
  zoning: string;
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

const styles = StyleSheet.create({
  // ============ HEADER & FOOTER ============
  headerImage: {
    position: "absolute",
    top: 5,
    right: 20,
    width: "40pt",
    height: "40pt",
    marginTop: 20,
  },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 0,
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
  footerText: {
    color: "#002060",
    textAlign: "center",
    fontSize: 8,
    fontWeight: "bold",
    marginLeft: "auto",
  },

  // ============ FRONT PAGE ============
  frontPage: {
    padding: 72,
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
    marginBottom: 10,
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
  frontPageRefLabel: {
    fontWeight: "normal",
    fontSize: 12,
  },
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
    fontSize: 10,
  },
  footerColumn: {
    flex: 1,
    padding: 6,
    color: "white",
    fontSize: 10,
    gap: 4,
    borderWidth: 0.1,
    borderColor: "#ffffff10",
    borderStyle: "solid",
  },

  // ============ CONTENT PAGES ============
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
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
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    color: "#000000c0",
    marginVertical: 10,
    fontWeight: "bold",
  },

  // ============ GREY BOXES ============
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
  },
  greyHeader: {
    fontStyle: "italic",
    fontWeight: "light",
    textAlign: "justify",
    color: "#00000090",
    lineHeight: 1.4,
  },
  greyText: {
    fontStyle: "italic",
    fontWeight: "light",
    textAlign: "justify",
    color: "#00000050",
    lineHeight: 1.4,
    paddingLeft: 15,
    marginTop: 5,
  },

  // ============ TABLES ============
  table: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    borderTop: "1px solid #ccc",
    borderLeft: "1px solid #ccc",
    marginVertical: 10,
  },
  cellLeft: {
    width: "50%",
    padding: 6,
    borderBottom: "1px solid #ccc",
    borderRight: "1px solid #ccc",
    backgroundColor: "#f8f8f8",
    fontSize: 9,
  },
  cellRight: {
    width: "50%",
    padding: 6,
    borderBottom: "1px solid #ccc",
    borderRight: "1px solid #ccc",
    fontSize: 9,
  },

  // ============ IMAGES ============
  fullWidthImage: {
    width: "95%",
    height: "auto",
    marginHorizontal: "auto",
    marginVertical: 10,
  },
  imageCaption: {
    fontSize: 9,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 15,
    color: "#666",
  },

  // ============ TEXT STYLES ============
  textBold: {
    fontWeight: "bold",
  },
  textRed: {
    color: "#dc2626",
  },
  textGreen: {
    color: "#16a34a",
  },
  textItalic: {
    fontStyle: "italic",
  },
  textSm: {
    fontSize: 10,
  },

  // ============ NUMBERED ITEMS ============
  numberedItem: {
    marginBottom: 8,
    flexDirection: "row",
  },
  number: {
    fontWeight: "bold",
    marginRight: 8,
    minWidth: 20,
  },
  content: {
    flex: 1,
    lineHeight: 1.4,
  },

  // ============ BULLET ITEMS ============
  bulletItem: {
    marginBottom: 6,
    flexDirection: "row",
  },
  bullet: {
    marginRight: 8,
    minWidth: 15,
  },

  // ============ QUOTE ============
  quoteText: {
    fontStyle: "italic",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#0A2D75",
    lineHeight: 1.4,
  },

  // ============ HIGHLIGHT BOX ============
  highlightBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#0A2D75",
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#0A2D75",
  },
  highlightContent: {
    fontSize: 11,
    lineHeight: 1.4,
  },
});

interface RevaReportPDFProps {
  property: any;
}

export function RevaReportPDF({ property }: RevaReportPDFProps) {
  const report: ReportType = property?.report || {};

  const Header = () => (
    <Image style={styles.headerImage} source="/reva/reva_pdf_logo.png" />
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

  // Check if title investigation data exists
  const hasTitleData =
    report.titleStatus || report.titleDate || report.titleName;

  // Check if parcel investigation data exists
  const hasParcelData =
    report.surveyPlanNumber ||
    report.parcelPositionMatch ||
    report.parcelStatus;

  // Check if physical planning data exists
  const hasPhysicalPlanningData =
    report.zoning || report.hasBuildingPlanApproval;

  return (
    <Document>
      {/* ============ FRONT PAGE ============ */}
      <Page size="LETTER" orientation="portrait" style={styles.frontPage}>
        <Image style={styles.revaLogo} source="/reva/reva_pdf_logo.png" />
        <Text style={styles.frontPageHeading}>Due Diligence Report</Text>

        <View style={styles.section}>
          <Text style={styles.frontPageAddress}>
            <Text style={styles.frontPageAddressText}>{property?.address}</Text>
            {property?.lga && (
              <Text style={styles.frontPageAddressText}> {property.lga}</Text>
            )}
          </Text>

          <Text style={styles.frontPagePoint}>
            {report?.centroid || property?.centroid || "Centroid - --"}
          </Text>

          <Text style={styles.frontPageClient}>
            <Text style={styles.frontPageRefLabel}>Client: </Text>
            {property?.user?.firstName ||
              property?.user?.lastName ||
              property?.requester ||
              "N/A"}
          </Text>

          <Text style={styles.frontPageRef}>
            <Text style={styles.frontPageRefLabel}>Reference: </Text>
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

      {/* ============ TITLE INVESTIGATION PAGE ============ */}
      {hasTitleData && (
        <Page size="LETTER" orientation="portrait" style={styles.page}>
          <HeaderAndFooter />

          <Text style={styles.heading}>Title Investigation (Lands Bureau)</Text>

          <View style={styles.numberedItem}>
            <Text style={styles.number}>1.</Text>
            <Text style={styles.content}>
              The property currently has{" "}
              {report.titleDate ? (
                <>
                  an existing title dated{" "}
                  <Text style={styles.textBold}>{report.titleDate}</Text>{" "}
                  between{" "}
                  <Text style={styles.textBold}>
                    {report.titleName || "N/A"}
                  </Text>{" "}
                  which{" "}
                  <Text style={styles.textBold}>
                    {report.titleStatus === "duly"
                      ? "is a duly registered instrument"
                      : "is not a duly registered instrument"}
                  </Text>{" "}
                  at the registry of deeds, lands bureau Lagos State as{" "}
                  <Text style={styles.textBold}>
                    {report.titleNumber || "N/A"}
                  </Text>
                  .
                </>
              ) : (
                <Text style={[styles.textBold, styles.textRed]}>
                  NO existing title registration.
                </Text>
              )}
            </Text>
          </View>

          {report.transactionFlow && (
            <View style={styles.section}>
              <Text style={styles.title}>Highlights</Text>
              <View style={styles.highlightBox}>
                <Text style={styles.highlightTitle}>
                  Transaction Flow Summary:
                </Text>
                <Text style={styles.highlightContent}>
                  {report.transactionFlow}
                </Text>
              </View>
            </View>
          )}

          {/* Transaction Flow Diagram */}
          {report.images?.transactionFlowImg && (
            <View style={styles.section}>
              <Text style={styles.title}>
                Diagram 1.0 - Transaction Flow at Property Parcel
              </Text>
              <Image
                style={styles.fullWidthImage}
                source={fileSrc(report.images.transactionFlowImg)}
              />
              {report.rightToSellHolder && (
                <View style={styles.quoteText}>
                  <Text>
                    "The question arises: Who holds the right to sell the
                    development?{" "}
                    <Text style={styles.textBold}>
                      {report.rightToSellHolder}
                    </Text>
                    "
                  </Text>
                </View>
              )}
            </View>
          )}

          {!report.titleDate && (
            <View style={styles.greyBg}>
              <Image style={styles.greyBgRedIcon} source="/reva/redIcon.png" />
              <Text style={styles.greyHeader}>
                The property currently has{" "}
                <Text style={[styles.textBold, styles.textRed]}>NO</Text>{" "}
                existing title registration.
              </Text>
            </View>
          )}
        </Page>
      )}

      {/* ============ PARCEL INVESTIGATION PAGE ============ */}
      {hasParcelData && (
        <Page size="LETTER" orientation="portrait" style={styles.page}>
          <HeaderAndFooter />

          <Text style={styles.heading}>
            Parcel Investigation (Office of the State Surveyor General)
          </Text>

          {/* Parcel Location Check */}
          <Text style={styles.title}>Parcel Location Check</Text>

          <View style={styles.greyBg}>
            <Image style={styles.greyBgRedIcon} source="/reva/redIcon.png" />
            <Text style={styles.greyHeader}>
              Parcel location using the following Reference:
            </Text>

            {/* Reference System Table */}
            <View style={styles.table}>
              <View style={styles.cellLeft}>
                <Text>Coordinate System</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>Minna_UTM_Zone_31N</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Projection</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>Transverse_Mercator</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>False_Easting</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>500000.0</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Central_Meridian</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>3.0</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Scale_Factor</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>0.9996</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Linear Unit</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>Meter (1.0)</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Geographic Coordinate System</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>GCS_Minna</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Angular Unit</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>Degree (0.0174532925199433)</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Prime Meridian</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>Greenwich (0.0)</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Datum</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>D_Minna</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Spheroid</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>Clarke_1880_RGS</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Semimajor Axis</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>6378249.145</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Semiminor Axis</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>6356514.869549775</Text>
              </View>

              <View style={styles.cellLeft}>
                <Text>Inverse Flattening</Text>
              </View>
              <View style={styles.cellRight}>
                <Text>293.465</Text>
              </View>
            </View>

            <Text style={[styles.textItalic, styles.textSm, { marginTop: 8 }]}>
              Please see Figure 1.0 below for the Parcel Overlay on Ortho
              Rectified Imagery
            </Text>
          </View>

          {/* Parcel Check Image */}
          {report.images?.parcelCheck && (
            <View style={styles.section}>
              <Image
                style={styles.fullWidthImage}
                source={fileSrc(report.images.parcelCheck)}
              />
              <Text style={styles.imageCaption}>Figure 1.0 - Parcel Check</Text>
            </View>
          )}

          {/* Parcel Position Match */}
          {report.parcelPositionMatch && (
            <View style={styles.section}>
              <Text style={styles.title}>
                Parcel Position Check on Lagos State Framework (Vector 04)
              </Text>

              <View style={styles.greyBg}>
                <Image
                  style={styles.greyBgRedIcon}
                  source="/reva/redIcon.png"
                />
                <Text style={styles.greyHeader}>
                  The{" "}
                  <Text style={[styles.textBold, styles.textGreen]}>
                    {report.surveyPlanNumber || "Survey Plan"}
                  </Text>{" "}
                  has a{" "}
                  <Text style={[styles.textBold, styles.textGreen]}>
                    {report.parcelPositionMatch}
                  </Text>{" "}
                  position match with the Lagos State Framework (Vector 04)
                </Text>
              </View>
            </View>
          )}

          {/* Charting Report */}
          {report.parcelStatus && (
            <View style={styles.section} wrap={false}>
              <Text style={styles.title}>
                Parcel Status Check - Charting Report
              </Text>

              <View style={styles.greyBg}>
                <Image
                  style={styles.greyBgRedIcon}
                  source="/reva/redIcon.png"
                />
                <Text style={styles.greyHeader}>
                  Based on the Above Parcel Check The Charting report Reveals
                  That:
                </Text>

                <Text style={styles.greyText}>
                  <Text style={styles.textBold}>Parcel Status: </Text>
                  {report.parcelStatus}
                </Text>

                {report.implicationOfParcelStatus && (
                  <Text style={styles.greyText}>
                    <Text style={styles.textBold}>Implication: </Text>
                    {report.implicationOfParcelStatus}
                  </Text>
                )}

                {report.commitmentStatus && (
                  <Text style={styles.greyText}>
                    <Text style={styles.textBold}>Commitment Status: </Text>
                    {report.commitmentStatus}
                  </Text>
                )}

                {report.setbacksInfo && (
                  <Text style={styles.greyText}>
                    <Text style={styles.textBold}>Setbacks: </Text>
                    {report.setbacksInfo}
                  </Text>
                )}

                {report.implicationOfsetbacksInfo && (
                  <Text style={styles.greyText}>
                    <Text style={styles.textBold}>Implication: </Text>
                    {report.implicationOfsetbacksInfo}
                  </Text>
                )}
              </View>

              {/* Charting Images */}
              {report.images?.parcelChartingFree && (
                <View style={{ marginTop: 10 }}>
                  <Image
                    style={styles.fullWidthImage}
                    source={fileSrc(report.images.parcelChartingFree)}
                  />
                  <Text style={styles.imageCaption}>
                    Figure 2.0 - Parcel Charting (Free from Government
                    Acquisition)
                  </Text>
                </View>
              )}

              {report.images?.parcelChartingOffset && (
                <View style={{ marginTop: 10 }}>
                  <Image
                    style={styles.fullWidthImage}
                    source={fileSrc(report.images.parcelChartingOffset)}
                  />
                  <Text style={styles.imageCaption}>
                    Figure 3.0 - Parcel Charting (Falls within setback)
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Historical Survey Records */}
          {report.historicalSurveys && (
            <View style={styles.section} wrap={false}>
              <Text style={styles.title}>Historical Survey Records</Text>

              <View style={styles.greyBg}>
                <Image
                  style={styles.greyBgRedIcon}
                  source="/reva/redIcon.png"
                />
                <Text style={styles.greyHeader}>
                  The most recent lodged survey plan for the property is Survey
                  Plan No.{" "}
                  <Text style={styles.textBold}>{report.surveyPlanNumber}</Text>
                  , archived at the office of the State Surveyor General
                  {report.dateOnSurveyPlan && (
                    <>
                      {" "}
                      on{" "}
                      <Text style={styles.textBold}>
                        {report.dateOnSurveyPlan}
                      </Text>
                    </>
                  )}
                  {report.surveyName && (
                    <>
                      . This survey was registered under{" "}
                      <Text style={styles.textBold}>{report.surveyName}</Text>
                    </>
                  )}
                  .
                </Text>

                <Text style={[styles.greyHeader, { marginTop: 10 }]}>
                  Prior to this, the following survey plans covering the same
                  area were recorded in descending order of date:
                </Text>

                <Text style={styles.greyText}>{report.historicalSurveys}</Text>
              </View>
            </View>
          )}
        </Page>
      )}

      {/* ============ PHYSICAL PLANNING PAGE ============ */}
      {hasPhysicalPlanningData && (
        <Page size="LETTER" orientation="portrait" style={styles.page}>
          <HeaderAndFooter />

          <Text style={styles.heading}>
            Parcel Investigation (Physical Planning)
          </Text>

          {/* Land Use Zoning */}
          {report.zoning && (
            <View style={styles.section}>
              <View style={styles.greyBg}>
                <Image
                  style={styles.greyBgRedIcon}
                  source="/reva/redIcon.png"
                />
                <Text style={styles.greyHeader}>
                  The Parcel falls within the{" "}
                  <Text style={[styles.textBold, styles.textRed]}>
                    {report.zoning}
                  </Text>{" "}
                  zone
                </Text>
              </View>

              {/* Land Use Check Image */}
              {report.images?.landUseCheck && (
                <View style={{ marginTop: 10 }}>
                  <Image
                    style={styles.fullWidthImage}
                    source={fileSrc(report.images.landUseCheck)}
                  />
                  <Text style={styles.imageCaption}>
                    Figure 4.0 - Parcel Land Use Check
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Building Plan Approval */}
          <View style={styles.section} wrap={false}>
            <Text style={styles.title}>Building Plan Approval</Text>

            <View style={styles.greyBg}>
              <Image style={styles.greyBgRedIcon} source="/reva/redIcon.png" />
              <Text style={styles.greyHeader}>
                Building Plan Approval Status:{" "}
                <Text style={[styles.textBold, styles.textRed]}>
                  {report.hasBuildingPlanApproval ? "YES" : "NO"}
                </Text>
              </Text>

              {report.hasBuildingPlanApproval && report.buildingPlanNo && (
                <Text style={styles.greyText}>
                  Building Plan Approval Number:{" "}
                  <Text style={styles.textBold}>{report.buildingPlanNo}</Text>
                </Text>
              )}
            </View>
          </View>
        </Page>
      )}

      {/* ============ NO DATA FALLBACK PAGE ============ */}
      {!hasTitleData && !hasParcelData && !hasPhysicalPlanningData && (
        <Page size="LETTER" orientation="portrait" style={styles.page}>
          <HeaderAndFooter />

          <Text style={styles.heading}>Report Status</Text>

          <View style={styles.greyBg}>
            <Image style={styles.greyBgRedIcon} source="/reva/redIcon.png" />
            <Text style={styles.greyHeader}>
              This report is currently being processed. Detailed investigation
              results will be available once the due diligence process is
              complete.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Property Information</Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text>Address: {property?.address}</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text>LGA: {property?.lga}</Text>
            </View>
            {property?.parcelId && (
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text>Parcel ID: {property.parcelId}</Text>
              </View>
            )}
          </View>
        </Page>
      )}
    </Document>
  );
}
