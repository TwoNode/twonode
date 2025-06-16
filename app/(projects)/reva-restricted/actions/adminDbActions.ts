"use server";

import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/utils/authUser";
import prisma from "@/lib/prisma";
import {
  deleteManyFromS3,
  uploadToS3FromServer,
} from "../../reva/actions/awsActions";
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
  includeOneTimeRequests = false,
}: {
  limit?: number;
  onlyWithReport?: boolean;
  includeOneTimeRequests?: boolean;
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

    let oneTimeProperties = null;
    if (includeOneTimeRequests) {
      oneTimeProperties = await prisma.oneTimeUserProperty.findMany({
        take: limit !== null ? limit : undefined,
        where: onlyWithReport
          ? {
              report: {
                not: Prisma.JsonNull,
              },
            }
          : undefined,
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    return {
      success: true,
      data: properties,
      oneTimeRequests: oneTimeProperties,
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

    const prevImages: Record<string, string> = formData.get("prevImages")
      ? JSON.parse(formData.get("prevImages") as string)
      : {};

    // Extract old image URLs that are being replaced
    const replacedImageUrls: string[] = [];
    filesMap.forEach(({ key }) => {
      console.log(key);
      if (prevImages?.[key]) {
        replacedImageUrls.push(prevImages[key]);
      }
    });

    console.log("\n\n\n\n\nprevImages", prevImages);

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
        images: prevImages,
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

    try {
      console.log(replacedImageUrls, prevImages);
      // Delete old images after successful upload
      if (replacedImageUrls.length > 0) {
        await deleteManyFromS3(replacedImageUrls.map((url) => ({ url })));
        console.log("\n\n\nPrevious Images deleted\n\n");
      }
    } catch (error) {
      console.log("\n\nError While deleting some replaced files");
      console.log(replacedImageUrls);
    }

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

      const logoDisplay = `
        <div style="
          background-color: #1e40af;
          background-image: linear-gradient(to right, #00000020, #ffffff);
          width: 100%;
        ">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; background-image: linear-gradient(to right, #00000020, #ffffff); padding: 16px 0;">
            <tr>
              <td align="center">
                <img
                  src="${process.env.ONLINE_BASE_URL}/logo.png"
                  alt="TwoNode Technologies"
                  style="height: 48px; max-width: 40%; margin-right: 8px;"
                />
                <img
                  src="${process.env.ONLINE_BASE_URL}/reva/revaLogo.png"
                  alt="REVA Logo"
                  style="height: 48px; max-width: 40%;"
                />
              </td>
            </tr>
          </table>
        </div>
      `;

      const mailTemplate = (
        title: string,
        greeting: string,
        body: string,
        link: string = "/reva"
      ) => {
        const normalizedLink = link.startsWith("/") ? link : `/${link}`;

        return `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        ">
          ${logoDisplay}

          <div style="
            background-color: #1e40af;
            background-image: linear-gradient(to right, #1e40af, #111827);
            padding: 24px;
            text-align: center;
            color: white;
          ">
            <h2 style="margin: 0; font-size: 24px;">🎉 Report ${title}!</h2>
            <p style="margin: 8px 0 0; font-size: 16px;">Reference: #${reference}</p>
          </div>

          <div style="padding: 24px; background-color: #f9fafb; color: #374151;">
            ${greeting}

            <p>${body}</p>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.ONLINE_BASE_URL}${normalizedLink}/dashboard/viewdetails?reference=${reference}"
                target="_blank"
                style="
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #10b981;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                  font-size: 16px;
                ">
                View Report
              </a>
            </div>

            <p style="font-size: 16px;">
              You can now view or download your report from the dashboard.
            </p>

            <p style="font-size: 14px; color: #6b7280;">Thank you for using our platform.</p>
          </div>
        </div>
      `;
      };

      await sendMail({
        to: process.env?.EMAIL_USER || "",
        subject: `[Super Admin] Due Diligence Report ${
          isApproved ? "Approved" : "Disapproved"
        }`,
        text: `Hello Super Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}.`,
        html: mailTemplate(
          isApproved ? "Approved" : "Disapproved",
          `<p style='font-size: 16px;'>Hello <strong>Super Admin</strong>,</p>`,
          `The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
          "/reva-restricted"
        ),
      });

      await sendMail({
        to: process.env?.ADMIN_EMAIL || "",
        subject: `[Admin] Due Diligence Report ${
          isApproved ? "Approved" : "Disapproved"
        }`,
        text: `Hello Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}.`,
        html: mailTemplate(
          isApproved ? "Approved" : "Disapproved",
          `<p style='font-size: 16px;'>Hello <strong>Admin</strong>,</p>`,
          `The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
          "/reva-restricted"
        ),
      });

      if (isApproved && property?.user?.email) {
        await sendMail({
          to: property.user.email,
          subject: `REVA: Your Due Diligence Report is Ready`,
          text: `Hello,\n\nYour due diligence report for property ${reference} has been approved and is now available in your dashboard.`,
          html: mailTemplate(
            "Approved",
            `<p style='font-size: 16px;'>Hello <strong>${
              property?.user?.firstName || "User"
            }</strong>,</p>`,
            `Your due diligence report for <strong>property #${reference}</strong> has been successfully approved.`
          ),
        });
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
