# REVA PDF Generation System

This document explains the automated PDF generation system for REVA due diligence reports and payment receipts.

## Overview

The REVA PDF generation system consists of three main components:

1. **RevaReportPDF** - Generates comprehensive due diligence reports
2. **RevaReceiptPDF** - Generates professional payment receipts  
3. **PDFDownloadButton** - Reusable component for PDF downloads

## Components

### 1. RevaReportPDF (`RevaReportPDF.tsx`)

Generates multi-page due diligence reports with dynamic sections based on available data.

#### Features:
- **Dynamic Content**: Only shows sections with available data
- **Professional Styling**: Matches REVA branding with blue/green color scheme
- **Multi-Page Layout**: Includes front page, title investigation, parcel investigation, and physical planning sections
- **Image Support**: Displays transaction flow diagrams, parcel checks, charting reports, and land use maps
- **Conditional Rendering**: Adapts to different report scenarios (with/without title, with/without parcel data, etc.)

#### Report Sections:

**Front Page:**
- REVA logo
- Report title
- Property address and location
- Client information
- Reference number
- Company contact information

**Title Investigation (Lands Bureau):**
- Title status and registration details
- Transaction flow summary
- Transaction flow diagram
- Right to sell holder information
- Registration flow tags

**Parcel Investigation (Office of the State Surveyor General):**
- Parcel location check with coordinate system details
- Parcel position match percentage
- Parcel status check (government acquisition, commitments, setbacks)
- Charting report with images
- Historical survey records

**Parcel Investigation (Physical Planning):**
- Land use zoning information
- Building plan approval status
- Land use check images

#### Usage:

```tsx
import { RevaReportPDF } from "@/app/(projects)/reva-restricted/dashboard/details/components/RevaReportPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";

<PDFDownloadLink
  document={<RevaReportPDF property={propertyData} />}
  fileName="REVA_Report.pdf"
>
  {({ loading }) => (loading ? "Generating..." : "Download Report")}
</PDFDownloadLink>
```

### 2. RevaReceiptPDF (`RevaReceiptPDF.tsx`)

Generates professional payment receipts with company branding.

#### Features:
- **Premium Design**: Professional layout with REVA branding
- **Payment Status**: Visual indicators for paid/pending status
- **Watermark**: "PAID" watermark for completed payments
- **Comprehensive Details**: Client info, property info, and payment details
- **Auto-formatting**: Currency and date formatting

#### Receipt Sections:

- Company header with logo and contact information
- Payment receipt title
- Reference number and date
- Payment status badge
- Client information (name, email)
- Property information (address, LGA, parcel ID, coordinates)
- Payment details (service type, amount)
- Additional notes/comments
- Footer with disclaimer and contact info

#### Usage:

```tsx
import { RevaReceiptPDF } from "@/app/(projects)/reva-restricted/dashboard/details/components/RevaReceiptPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";

<PDFDownloadLink
  document={<RevaReceiptPDF property={propertyData} />}
  fileName="REVA_Receipt.pdf"
>
  {({ loading }) => (loading ? "Generating..." : "Download Receipt")}
</PDFDownloadLink>
```

### 3. PDFDownloadButton (`PDFDownloadButton.tsx`)

Reusable button component for downloading both reports and receipts.

#### Features:
- **Dual Purpose**: Handles both report and receipt downloads
- **Loading States**: Shows loading spinner during PDF generation
- **Error Handling**: Displays error states if generation fails
- **Conditional Disabling**: Can be disabled based on payment status or data availability
- **Custom Styling**: Accepts className prop for custom styling

#### Props:

```typescript
interface PDFDownloadButtonProps {
  property: any;              // Property data object
  type: "report" | "receipt"; // Type of PDF to generate
  disabled?: boolean;         // Optional disable state
  className?: string;         // Optional custom CSS classes
}
```

#### Usage:

```tsx
import { PDFDownloadButton } from "@/app/(projects)/reva-restricted/dashboard/details/components/PDFDownloadButton";

// Download Report
<PDFDownloadButton
  property={propertyData}
  type="report"
  disabled={!isReportReady()}
/>

// Download Receipt
<PDFDownloadButton
  property={propertyData}
  type="receipt"
  disabled={paymentStatus !== "paid"}
/>
```

## Data Structure

### ReportType Interface

```typescript
export type ReportType = {
  // Location
  centroid: string | null;

  // Title Information
  titleStatus: string;
  titleDate: string | null;
  titleName: string | null;
  titleNumber: string;
  rightToSellHolder: string;
  transactionFlow: string;

  // Parcel Information
  parcelPositionMatch: string;
  parcelStatus: string;
  implicationOfParcelStatus: string | null;
  commitmentStatus: string | null;
  implicationOfCommitmentStatus: string | null;
  setbacksInfo: string;
  implicationOfsetbacksInfo: string | null;

  // Survey Information
  surveyPlanNumber: string;
  surveyName: string;
  dateOnSurveyPlan: string | null;
  historicalSurveys: string;

  // Physical Planning
  zoning: string;
  hasBuildingPlanApproval: boolean;
  buildingPlanNo: string;

  // Images
  images: {
    transactionFlowImg: string;
    parcelCheck: string;
    parcelChartingFree: string;
    parcelChartingOffset: string;
    landUseCheck: string;
  };
};
```

### Property Data Structure

```typescript
interface PropertyData {
  reference: string;
  title?: string;
  address: string;
  lga: string;
  parcelId?: string;
  lat?: number;
  lng?: number;
  totalCost: number;
  paymentStatus: string;
  paymentLink?: string;
  comments?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  requester?: string;
  email?: string;
  report?: ReportType;
  site_images?: string[];
}
```

## Styling

### Color Scheme

- **Primary Blue**: `#0A2D75` - Headers, titles, company branding
- **Accent Green**: `#04b104` / `#16a34a` - Borders, success indicators
- **Red**: `#dc2626` - Warnings, important information
- **Grey**: `#e7e3e3` - Background boxes, subtle elements

### Typography

- **Font Family**: Helvetica
- **Heading Sizes**: 36pt (front page), 16pt (section headings), 14pt (subsections)
- **Body Text**: 11pt
- **Small Text**: 9-10pt

## Assets Required

The PDF generation system requires the following assets in the `/public/reva/` directory:

- `reva_pdf_logo.png` - Main REVA logo (used in headers and front page)
- `redIcon.png` - Red icon for information boxes

## Integration Example

Here's a complete example of integrating the PDF system into a page:

```tsx
"use client";

import React from "react";
import { PDFDownloadButton } from "@/app/(projects)/reva-restricted/dashboard/details/components/PDFDownloadButton";

export default function PropertyDetailsPage({ property }: { property: any }) {
  const isReportReady = () => {
    return property?.report?.isApproved === true;
  };

  const isPaymentComplete = () => {
    return property?.paymentStatus?.toLowerCase() === "paid";
  };

  return (
    <div className="space-y-4">
      {/* Download Report */}
      <PDFDownloadButton
        property={property}
        type="report"
        disabled={!isReportReady()}
        className="w-full sm:w-auto"
      />

      {/* Download Receipt */}
      <PDFDownloadButton
        property={property}
        type="receipt"
        disabled={!isPaymentComplete()}
        className="w-full sm:w-auto"
      />
    </div>
  );
}
```

## Best Practices

1. **Data Validation**: Always validate that required data exists before generating PDFs
2. **Image URLs**: Ensure all image URLs are accessible and properly formatted
3. **Loading States**: Use the built-in loading states to provide user feedback
4. **Error Handling**: Implement proper error handling for failed PDF generation
5. **File Naming**: Use descriptive file names with reference numbers for easy identification
6. **Responsive Design**: The PDFDownloadButton is responsive and works on mobile devices

## Troubleshooting

### Common Issues:

**PDF Generation Fails:**
- Check that all required data fields are present
- Verify image URLs are accessible
- Ensure @react-pdf/renderer is properly installed

**Images Not Showing:**
- Verify image paths are correct and accessible
- Check that images are in supported formats (PNG, JPG, WEBP)
- Ensure images are not too large (optimize if necessary)

**Styling Issues:**
- Remember that @react-pdf/renderer uses a subset of CSS
- Use StyleSheet.create() for all styles
- Avoid using CSS-in-JS or external stylesheets

## Future Enhancements

Potential improvements for the PDF generation system:

1. **Digital Signatures**: Add support for digital signatures
2. **QR Codes**: Include QR codes for verification
3. **Multi-language Support**: Add support for multiple languages
4. **Custom Templates**: Allow admins to customize report templates
5. **Batch Generation**: Generate multiple reports at once
6. **Email Integration**: Automatically email PDFs to clients
7. **Version Control**: Track different versions of reports
8. **Watermarking**: Add custom watermarks for different report statuses

## Support

For issues or questions about the PDF generation system, contact:
- Email: reva@twonodetechnologies.com
- Phone: +234 706 922 7677
