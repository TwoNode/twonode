"use server";

import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/utils/authUser";
import prisma from "@/lib/prisma";
import { uploadToS3FromServer } from "../../reva/actions/awsActions";
import { revalidatePath } from "next/cache";
import { createTransport } from "nodemailer";

const AVAILABLE = "Available";
const COMPLETED = "Completed";
const PROCESSING = "Processing";

export const sendMail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) => {
  try {
    const transporter = createTransport({
      service: "Zoho",
      auth: {
        user: process?.env?.EMAIL_USER, // Your email address
        pass: process?.env?.EMAIL_PASS, // Your email password or app-specific password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response);

    return { success: true, info };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

export const superAdminCheck = async (user: any) => {
  try {
    if (!user || user.role !== "SUPERADMIN") {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const getAllRequestsWithUserByAdmin = async ({
  limit,
  onlyWithReport = false,
}: {
  limit?: number;
  onlyWithReport?: boolean;
} = {}) => {
  try {
    const properties = await prisma.property.findMany({
      take: limit !== null ? limit : undefined,
      where: onlyWithReport
        ? {
            report: {
              not: Prisma.JsonNull,
            },
          }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kindeId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      success: true,
      data: properties,
    };
  } catch (error) {
    console.error("Error fetching properties:", error);
    return { success: false, error: "Failed to fetch properties" };
  }
};

export const getRequestByReferenceByAdmin = async (reference: string) => {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, message: "User is not authenticated." };
    }

    const request = await prisma.property.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kindeId: true,
          },
        },
      },
    });

    return { success: true, data: request, user };
  } catch (error) {
    console.error("Error fetching request:", error);
    return { success: false, error: "Failed to fetch request" };
  }
};

export const uploadDueDiligenceReport = async (formData: FormData) => {
  try {
    let warnings: string[] = [] as string[];
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: "User is not authenticated.", status: 401 };
    }

    const reference = formData.get("reference") as string;
    if (!reference) {
      return { error: "Missing property reference.", status: 400 };
    }

    const fileKeys = [
      "transactionFlowImg",
      "parcelCheck",
      "parcelChartingFree",
      "parcelChartingOffset",
      "landUseCheck",
    ];

    const filesMap: { key: string; file: File }[] = fileKeys
      .map((key) => {
        const file = formData.get(key);
        return file instanceof File ? { key, file } : null;
      })
      .filter(Boolean) as { key: string; file: File }[];

    const report: Record<string, any> = Object.fromEntries(
      Object.entries({
        titleStatus: formData.get("titleStatus"),
        titleNumber: formData.get("titleNumber"),
        rightToSellHolder: formData.get("rightToSellHolder"),
        transactionFlow: formData.get("transactionFlow"),
        parcelPositionMatch: formData.get("parcelPositionMatch"),
        parcelStatus: formData.get("parcelStatus"),
        surveyPlanNumber: formData.get("surveyPlanNumber"),
        surveyName: formData.get("surveyName"),
        historicalSurveys: formData.get("historicalSurveys"),
        zoning: formData.get("zoning"),
        hasBuildingPlanApproval:
          formData.get("hasBuildingPlanApproval") === "true",
        buildingPlanNo: formData.get("buildingPlanNo"),
        setbacksInfo: formData.get("setbacksInfo"),
        images: formData.get("prevImages")
          ? JSON.parse(formData.get("prevImages") as string)
          : {},
      }).filter(
        ([_, value]) =>
          value !== "" &&
          value !== null &&
          value !== undefined &&
          !(Array.isArray(value) && value.length === 0) &&
          !(
            typeof value === "object" &&
            !Array.isArray(value) &&
            Object?.keys(value)?.length === 0
          )
      )
    );

    // filesMap.forEach((f, idx) => {
    //   report.images[f.key] = uploadedUrls[idx];
    // });

    console.log("\n\n\n\nreport\n\n\n\n", report);

    await uploadFilesToS3AndUpdateReport(filesMap, report, reference);

    const existingProperty = await prisma.property.findUnique({
      where: { reference },
    });

    const previousReport =
      existingProperty?.report && typeof existingProperty.report === "object"
        ? existingProperty.report
        : {};

    console.log(previousReport);

    const result = await prisma.property.update({
      where: { reference },
      data: {
        status: COMPLETED,
        report: {
          ...previousReport,
          ...report,
        },
      },
    });

    try {
      await sendMail({
        to: process.env.EMAIL_USER || "", // Replace with the actual recipient email
        subject: "Due Diligence Report Update",
        text: "The due diligence report has been updated successfully, please review the report.",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Due Diligence Report Update</h2>
            <p>Dear User,</p>
            <p>The due diligence report has been updated successfully. Please review the report at your earliest convenience.</p>
            <p>Thank you for your attention.</p>
            <p style="margin-top: 20px;">Best regards,</p>
            <p><strong>Your Company Name</strong></p>
          </div>
        `,
      });
    } catch (err) {
      console.log("Email not sent: ", err);
      warnings.push("Email not sent");
    }

    revalidatePath(
      `/reva-restricted/dashboard/viewdetails?reference=${reference}`
    );

    return {
      success: true,
      warnings,
      data: result,
    };
  } catch (error) {
    console.error("Error updating due diligence report:", error);
    return { error: error, success: false };
  }
};

export const uploadDirectLinkReport = async (formData: FormData) => {
  try {
    let warnings: string[] = [] as string[];
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: "User is not authenticated.", status: 401 };
    }

    const reference = formData.get("reference") as string;
    if (!reference) {
      return { error: "Missing property reference.", status: 400 };
    }

    const file = formData.get("directLink");

    if (!file || !(file instanceof File)) {
      throw new Error("Missing or invalid file: 'directLink'");
    }

    const directFileLink = await uploadToS3FromServer([file], reference, {
      useDirectFileName: true,
    });

    console.log("\n\n\n\nreport\n\n\n\n", directFileLink);

    const existingProperty = await prisma.property.findUnique({
      where: { reference },
    });

    const previousReport =
      existingProperty?.report && typeof existingProperty.report === "object"
        ? existingProperty.report
        : {};

    console.log(previousReport);

    const result = await prisma.property.update({
      where: { reference },
      data: {
        status: COMPLETED,
        report: {
          ...previousReport,
          directFileLink,
        },
      },
    });

    try {
      await sendMail({
        to: process.env.EMAIL_USER || "", // Replace with the actual recipient email
        subject: "Due Diligence Report Update",
        text: "The due diligence report has been updated successfully, please review the report.",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Due Diligence Report Update</h2>
            <p>Dear User,</p>
            <p>The due diligence report has been updated successfully. Please review the report at your earliest convenience.</p>
            <p>Thank you for your attention.</p>
            <p style="margin-top: 20px;">Best regards,</p>
            <p><strong>Your Company Name</strong></p>
          </div>
        `,
      });
    } catch (err) {
      console.log("Email not sent: ", err);
      warnings.push("Email not sent");
    }

    revalidatePath(
      `/reva-restricted/dashboard/viewdetails?reference=${reference}`
    );

    return {
      success: true,
      warnings,
      data: result,
    };
  } catch (error) {
    console.error("Error updating due diligence report:", error);
    return { error: error, success: false };
  }
};

async function uploadFilesToS3AndUpdateReport(
  filesMap: { key: string; file: File }[],
  report: Record<string, any>,
  reference: string
) {
  try {
    await Promise.all(
      filesMap.map(async (f) => {
        console.log(f.key, f.file);

        try {
          const uploadedUrl = await uploadToS3FromServer([f.file], reference);
          report.images[f.key] = uploadedUrl[0]; // Assuming uploadToS3FromServer returns an array of URLs
        } catch (error) {
          console.log(f.key, ": File was not uploaded");
        }
      })
    );

    console.log(`Successfully uploaded files for reference: ${reference}`);
  } catch (error) {
    console.error(
      `Error uploading files to S3 for reference: ${reference}`,
      error
    );
    // throw new Error("Failed to upload files to S3.");
  }
}

export const approveDueDiligenceReport = async (
  reference: string,
  isApproved = true
) => {
  try {
    let warnings: string[] = [];

    console.log("\n\n\n\n\n", reference, "\n\n\n\n\n");
    const user = await getAuthenticatedUser();
    const isSuperAdmin = superAdminCheck(user);

    if (!isSuperAdmin) {
      throw "User is not authenticated.";
    }

    if (!reference) {
      throw "Reference is not valid.";
    }

    const property = await prisma.property.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kindeId: true,
          },
        },
      },
    });

    if (
      !property ||
      !property?.report ||
      typeof property?.report !== "object"
    ) {
      throw "Property or report not found.";
    }

    const updatedReport = {
      ...(typeof property?.report === "object" ? property.report : {}),
      isApproved,
    };

    console.log("\n\n\n\n\n");
    console.log(property?.user?.email, updatedReport);
    console.log("\n\n\n\n\n");

    const result = await prisma.property.update({
      where: { reference },
      data: {
        report: updatedReport,
        status: isApproved ? AVAILABLE : PROCESSING,
      },
    });

    try {
      const statusText = isApproved ? "approved" : "disapproved";

      await sendMail({
        to: process.env?.EMAIL_USER || "",
        subject: `[Super Admin] Due Diligence Report ${
          isApproved ? "Approved" : "Disapproved"
        }`,
        text: `Hello Super Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}.`,
        html: `<p><strong>Super Admin Alert:</strong></p><p>The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.</p>`,
      });

      await sendMail({
        to: process.env?.ADMIN_EMAIL || "",
        subject: `[Admin] Due Diligence Report ${
          isApproved ? "Approved" : "Disapproved"
        }`,
        text: `Hello Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}. Please review it on your dashboard.`,
        html: `<p>The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.</p>`,
      });

      if (isApproved && property?.user?.email) {
        // await sendMail({
        //   to: property?.user?.email || "",
        //   subject: "[User] Your Due Diligence Report is Ready",
        //   text: `Hello,\n\nYour due diligence report for property ${reference} has been approved and is now available in your dashboard.`,
        //   html: `<p>Great news! The due diligence report for property <strong>${reference}</strong> has been approved. You can now view or download it from your dashboard.</p>`,
        // });
      }
    } catch (err) {
      console.log("Email not sent: ", err);
      warnings.push("Email not sent");
    }

    revalidatePath(
      `/reva-restricted/dashboard/viewdetails?reference=${reference}`
    );

    return {
      success: true,
      warnings,
      data: result,
    };
  } catch (error) {
    console.error(
      "\n\n\n\nError approving due diligence report : ",
      reference,
      error
    );
    return { error: error, success: false };
  }
};
