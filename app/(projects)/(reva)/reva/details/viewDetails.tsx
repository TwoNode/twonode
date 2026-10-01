"use client";

import { FC, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { removeIdPrefix } from "@/utils/removeIDFromParcel";
import RevaHeroSection from "../RevaHeroSection";
import RevaFooterSection from "../RevaFooterSection";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const ViewDetailsContent = ({ formData }: { formData: any }) => {
  const router = useRouter();

  const [transactionDetails, setTransactionDetails] = useState({});
  const searchParams = useSearchParams();
  const trxref = searchParams.get("trxref");
  const reference = searchParams.get("reference");

  console.log("Transaction Reference:", trxref);
  console.log("Reference:", reference);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-white/5 flex items-center justify-center px-4 py-12">
      <div className="bg-white dark:bg-surface shadow-2xl rounded-2xl p-10 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-green-700 text-center mb-6">
          Due Diligence Request Successful
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Thank you for your due diligence request.
          <br />
          Your REVA transaction reference is:
        </p>

        <div className="text-center text-blue-600 font-semibold text-lg mb-6">
          {/* Transaction Ref: <span>{trxref}</span> */}
          Reference: <span>{reference}</span>
        </div>

        <div className="space-y-4">
          <Detail label="Requester Name" value={formData?.requester} />
          <Detail label="Email" value={formData?.email} />
          <Detail label="Property Address" value={formData?.address} />
          <Detail
            label="Location"
            value={`${formData?.lat}, ${formData?.lng}`}
          />
          <Detail
            label="Parcel ID"
            value={removeIdPrefix(formData?.parcelId)}
          />
          <Detail label="LGA" value={formData?.lga} />
          <Detail
            label="Total Cost"
            value={formData?.totalCost?.toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
            })}
          />
          {formData?.comments && (
            <Detail label="Comments" value={formData?.comments} />
          )}
        </div>

        <div className="mt-8 text-center">
          {/* <PDFDownloadLink
            document={<ReceiptPDF formData={formData} />}
            fileName={`REVA_Receipt_${formData?.reference}.pdf`}
            className="bg-green-600 text-white py-3 px-6 rounded-lg shadow-md hover:bg-green-700 mr-4"
          >
            {({ loading }) =>
              loading ? "Generating Receipt..." : "Download PDF Receipt"
            }
          </PDFDownloadLink> */}
          <Button
            className="bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md hover:bg-blue-700"
            onClick={() => router.push("/reva")}
          >
            Go to Reva Homepage
          </Button>
        </div>
      </div>
    </div>
  );
};

const ViewDetails = ({ formData }: { formData: any }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <>
        <RevaHeroSection
          showRequestButton={false}
          smallLogo
          showTitle={false}
        />

        <ViewDetailsContent formData={formData} />

        <RevaFooterSection />
      </>
    </Suspense>
  );
};

export default ViewDetails;

const Detail = ({ label = "", value = "" }) => (
  <div className="flex justify-between items-center border-b pb-2">
    <span className="text-gray-600 dark:text-gray-400 font-medium">{label}:</span>
    <span className="text-gray-800 dark:text-gray-200 font-semibold text-right ml-4 max-w-[60%] truncate">
      {value}
    </span>
  </div>
);

const ReceiptPDF = ({ formData }: { formData: any }) => {
  const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: "Helvetica" },
    title: {
      fontSize: 20,
      marginBottom: 20,
      textAlign: "center",
      color: "#166534",
      fontWeight: "bold",
    },
    section: { marginBottom: 10 },
    label: { fontWeight: "bold", color: "#166534" },
    value: { marginLeft: 8 },
    ref: {
      color: "#2563eb",
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 10,
      textAlign: "center",
    },
    footer: { marginTop: 30, textAlign: "center", fontSize: 10, color: "#888" },
  });
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Due Diligence Payment Receipt</Text>
        <Text style={styles.ref}>Reference: {formData?.reference}</Text>
        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Requester Name:</Text>{" "}
            <Text style={styles.value}>{formData?.requester}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Email:</Text>{" "}
            <Text style={styles.value}>{formData?.email}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Property Address:</Text>{" "}
            <Text style={styles.value}>{formData?.address}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Location:</Text>{" "}
            <Text style={styles.value}>
              {formData?.lat}, {formData?.lng}
            </Text>
          </Text>
          <Text>
            <Text style={styles.label}>Parcel ID:</Text>{" "}
            <Text style={styles.value}>
              {removeIdPrefix(formData?.parcelId)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.label}>LGA:</Text>{" "}
            <Text style={styles.value}>{formData?.lga}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Total Cost:</Text>{" "}
            <Text style={styles.value}>
              {formData?.totalCost?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              })}
            </Text>
          </Text>
          {formData?.comments && (
            <Text>
              <Text style={styles.label}>Comments:</Text>{" "}
              <Text style={styles.value}>{formData?.comments}</Text>
            </Text>
          )}
        </View>
        <Text style={styles.footer}>
          Thank you for your payment. This receipt is system generated and valid
          without signature.
        </Text>
      </Page>
    </Document>
  );
};
