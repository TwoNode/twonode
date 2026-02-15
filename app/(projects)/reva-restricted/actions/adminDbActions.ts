"use server";

import { Prisma } from "@/prisma/generated";
import { getEncryptedUserData, isPlatformUser } from "@/utils/encryptedCookies";
import prisma from "@/lib/prisma";
import {
  deleteManyFromS3,
  uploadToS3FromServer,
} from "../../reva/actions/awsActions";
import { revalidatePath } from "next/cache";
import { createTransport } from "nodemailer";
import { Platform } from "@/utils/platform";
import {
  canAccessRevaAdminPanel,
  canAccessRevaSuperAdminPanel,
} from "@/permissions";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  notifyReportReady,
  notifySystemAlert,
} from "../../reva/actions/revaActions";

const AVAILABLE = "Available";
const COMPLETED = "Completed";
const PROCESSING = "Processing";

// Helper function to get all admin emails
const getAllAdminEmails = async () => {
  const adminUsers = await prisma.revaUser.findMany({
    where: {
      role: { in: ["ADMIN", "SUPERADMIN"] },
      is_active: true,
    },
    select: { email: true },
  });

  return adminUsers.map((user) => user.email);
  // .filter((email) => email && email !== process.env.DEV_EMAIL);
};

// Helper function to get all superadmin emails
const getAllSuperAdminEmails = async () => {
  const superadminUsers = await prisma.revaUser.findMany({
    where: {
      role: "SUPERADMIN",
      is_active: true,
    },
    select: { email: true },
  });

  return superadminUsers.map((user) => user.email);
  // .filter((email) => email && email !== process.env.DEV_EMAIL);
};

// Function to send email to all admins
export const sendEmailToAllAdmins = async ({
  subject,
  text,
  html,
}: {
  subject: string;
  text: string;
  html: string;
}) => {
  try {
    const adminEmails = await getAllAdminEmails();

    if (adminEmails.length === 0) {
      console.log("No admin emails found to send notification to");
      return { success: false, error: "No admin emails found" };
    }

    const result = await sendMail({
      to: adminEmails.join(","),
      subject,
      text,
      html,
    });

    console.log(
      `Email sent to ${adminEmails.length} admins: ${adminEmails.join(", ")}`
    );
    return { success: true, data: result, recipientCount: adminEmails.length };
  } catch (error) {
    console.error("Error sending email to all admins:", error);
    return { success: false, error: "Failed to send email to admins" };
  }
};

// Function to send email to all superadmins
export const sendEmailToAllSuperAdmins = async ({
  subject,
  text,
  html,
}: {
  subject: string;
  text: string;
  html: string;
}) => {
  try {
    const superadminEmails = await getAllSuperAdminEmails();

    if (superadminEmails.length === 0) {
      console.log("No superadmin emails found to send notification to");
      return { success: false, error: "No superadmin emails found" };
    }

    const result = await sendMail({
      to: superadminEmails.join(","),
      subject,
      text,
      html,
    });

    console.log(
      `Email sent to ${superadminEmails.length
      } superadmins: ${superadminEmails.join(", ")}`
    );
    return {
      success: true,
      data: result,
      recipientCount: superadminEmails.length,
    };
  } catch (error) {
    console.error("Error sending email to all superadmins:", error);
    return { success: false, error: "Failed to send email to superadmins" };
  }
};

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
        user: process?.env?.EMAIL_USER,
        pass: process?.env?.EMAIL_PASS,
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

// Enhanced admin access verification using encrypted cookies
export const verifyRevaAdminPermissions = async () => {
  const userData = await getEncryptedUserData();

  const { isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();

  if (!UserIsAuthenticated) {
    throw new Error("Not Authenticated");
  }

  if (!userData) {
    throw new Error("No user data found");
  }

  if (!isPlatformUser(userData, Platform.REVA)) {
    throw new Error("Wrong platform");
  }

  if (!canAccessRevaAdminPanel(userData.role)) {
    throw new Error("Insufficient permissions");
  }

  return userData;
};

// Enhanced super admin access verification
export const verifyRevaSuperAdminPermissions = async () => {
  const userData = await getEncryptedUserData();

  const { isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();

  if (!UserIsAuthenticated) {
    throw new Error("Not Authenticated");
  }

  if (!userData) {
    throw new Error("No user data found");
  }

  if (!isPlatformUser(userData, Platform.REVA)) {
    throw new Error("Wrong platform");
  }

  if (!canAccessRevaSuperAdminPanel(userData.role)) {
    throw new Error("Insufficient permissions - Super Admin access required");
  }

  return userData;
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
    // Verify admin access before proceeding
    await verifyRevaAdminPermissions();

    const properties = await prisma.property.findMany({
      take: limit !== null ? limit : undefined,
      where: onlyWithReport
        ? {
          report: {
            not: Prisma.JsonNull as any,
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
              not: Prisma.JsonNull as any,
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
    // Verify admin access before proceeding
    const userData = await verifyRevaAdminPermissions();

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

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    return { success: true, data: request, user: userData };
  } catch (error) {
    console.error("Error fetching request:", error);
    return { success: false, error: "Failed to fetch request" };
  }
};

export const getOneTimeRequestByReferenceByAdmin = async (
  reference: string
) => {
  try {
    // Verify admin access before proceeding
    const userData = await verifyRevaAdminPermissions();

    const request = await prisma.oneTimeUserProperty.findUnique({
      where: { reference },
    });

    if (!request) {
      return { success: false, error: "OneTime request not found" };
    }

    return { success: true, data: request, user: userData };
  } catch (error) {
    console.error("Error fetching OneTime request:", error);
    return { success: false, error: "Failed to fetch OneTime request" };
  }
};

export const uploadDueDiligenceReport = async (formData: FormData) => {
  try {
    let warnings: string[] = [] as string[];

    // Verify admin access before proceeding
    const userData = await verifyRevaAdminPermissions();

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

    // Trigger notification for report upload
    try {
      await notifySystemAlert(
        "Report Uploaded",
        `Due diligence report for property ${reference} has been uploaded by ${userData.email}.`,
        []
      );
    } catch (error) {
      console.error("Error creating notification:", error);
      warnings.push("Notification not sent");
    }

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
    let warnings: string[] = [];
    let user;

    try {
      user = await verifyRevaAdminPermissions();
      if (!user) {
        return {
          error: "Unauthorized: Admin permissions required.",
          status: 401,
        };
      }
    } catch (authError) {
      console.error("Authentication error:", authError);
      return {
        error: "Authentication failed. Please log in again.",
        status: 401,
      };
    }

    const reference = formData.get("reference") as string;
    const isOneTimeRequest = formData.get("isOneTimeRequest") === "true";

    if (!reference) {
      return { error: "Missing property reference.", status: 400 };
    }

    // Handle one-time requests
    if (isOneTimeRequest) {
      const existingRequest = await prisma.oneTimeUserProperty.findUnique({
        where: { reference },
      });

      if (!existingRequest) {
        return {
          error: "One-time request not found.",
          success: false,
          status: 404,
        };
      }

      const file = formData.get("directLink");
      if (!file || !(file instanceof File)) {
        throw new Error("Missing or invalid file: 'directLink'");
      }

      const directFileLink = await uploadToS3FromServer([file], reference, {
        useDirectFileName: true,
      });

      const previousReport =
        existingRequest?.report && typeof existingRequest.report === "object"
          ? existingRequest.report
          : {};

      const report = {
        ...previousReport,
        directFileLink,
        completedAt: new Date().toISOString(),
        completedBy: user.email,
      };

      const result = await prisma.oneTimeUserProperty.update({
        where: { reference },
        data: {
          status: COMPLETED,
          report,
        },
      });

      // Send notification email to the requester
      try {
        await sendMail({
          to: existingRequest.email,
          subject: "Your Due Diligence Report is Ready",
          text: `Your due diligence report for request ${reference} is now available for download.`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #4CAF50;">Your Due Diligence Report is Ready</h2>
              <p>Dear ${existingRequest.requester || "Valued Customer"},</p>
              <p>Your due diligence report for request <strong>${reference}</strong> is now available for download.</p>
              <p>You can download your report by clicking the link below:</p>
              <p><a href="${process.env.ONLINE_BASE_URL
            }/reva/onetimerequest?reference=${reference}&email=${encodeURIComponent(
              existingRequest.email
            )}" style="color: #1e40af; text-decoration: underline;">Download Report</a></p>
              <p>Thank you for using our service.</p>
              <p style="margin-top: 20px;">Best regards,</p>
              <p><strong>REVA Team</strong></p>
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

      // Trigger notification for direct link report upload
      try {
        await notifySystemAlert(
          "One-Time Request Report Uploaded",
          `Report for one-time request ${reference} has been uploaded by ${user.email}.`,
          []
        );
      } catch (error) {
        console.error("Error creating notification:", error);
        warnings.push("Notification not sent");
      }

      return {
        success: true,
        warnings,
        data: result,
        message: "Report uploaded successfully",
        status: 200,
      };
    }

    // Handle regular property requests
    const existingProperty = await prisma.property.findUnique({
      where: { reference },
      include: { user: true },
    });

    if (!existingProperty) {
      return { error: "Property not found.", success: false, status: 404 };
    }

    const file = formData.get("directLink");

    if (!file || !(file instanceof File)) {
      throw new Error("Missing or invalid file: 'directLink'");
    }

    const directFileLink = await uploadToS3FromServer([file], reference, {
      useDirectFileName: true,
    });

    const previousReport =
      existingProperty?.report && typeof existingProperty.report === "object"
        ? existingProperty.report
        : {};

    const report = {
      ...previousReport,
      directFileLink,
      completedAt: new Date().toISOString(),
      completedBy: user.email,
    };

    const result = await prisma.property.update({
      where: { reference },
      data: {
        status: COMPLETED,
        report,
      },
    });

    try {
      await sendMail({
        to: process.env.EMAIL_USER || "",
        subject: "Due Diligence Report Update",
        text: "The due diligence report has been updated successfully, please review the report.",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Due Diligence Report Update</h2>
            <p>Dear User,</p>
            <p>The due diligence report has been updated successfully. Please review the report at your earliest convenience.</p>
            <p>Thank you for your attention.</p>
            <p style="margin-top: 20px;">Best regards,</p>
            <p><strong>REVA Team</strong></p>
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

    // Trigger notification for direct link report upload
    try {
      await notifySystemAlert(
        "Direct Link Report Uploaded",
        `Direct link report for property ${reference} has been uploaded by ${user.email}.`,
        []
      );
    } catch (error) {
      console.error("Error creating notification:", error);
      warnings.push("Notification not sent");
    }

    return {
      success: true,
      warnings,
      data: result,
      message: "Report uploaded successfully",
      status: 200,
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
    const user = await verifyRevaAdminPermissions();

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
      approvedAt: new Date().toISOString(),
      approvedBy: user.email,
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
        subject: `[Super Admin] Due Diligence Report ${isApproved ? "Approved" : "Disapproved"
          }`,
        text: `Hello Super Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}.`,
        html: mailTemplate(
          isApproved ? "Approved" : "Disapproved",
          `<p style='font-size: 16px;'>Hello <strong>Super Admin</strong>,</p>`,
          `The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
          "/reva-restricted"
        ),
      });

      // Send email to all admins
      await sendEmailToAllAdmins({
        subject: `[Admin] Due Diligence Report ${isApproved ? "Approved" : "Disapproved"
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
            `<p style='font-size: 16px;'>Hello <strong>${property?.user?.firstName || "User"
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

    // Trigger notifications
    try {
      if (isApproved) {
        // Notify user that report is ready
        if (property?.user?.id) {
          await notifyReportReady(property, property.user.id);
        }

        // Notify admins about approved report
        await notifySystemAlert(
          "Report Approved",
          `Due diligence report for property ${reference} has been approved by ${user.email}`,
          []
        );
      } else {
        // Notify admins about disapproved report
        await notifySystemAlert(
          "Report Disapproved",
          `Due diligence report for property ${reference} has been disapproved by ${user.email}`,
          []
        );
      }
    } catch (error) {
      console.error("Error creating notifications:", error);
      warnings.push("Notifications not sent");
    }

    return {
      success: true,
      warnings,
      data: result,
      message: `Report ${isApproved ? "approved" : "rejected"} successfully`,
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

export const approveOneTimeDueDiligenceReport = async (
  reference: string,
  isApproved = true
) => {
  try {
    let warnings: string[] = [];

    console.log("\n\n\n\n\n", reference, "\n\n\n\n\n");
    const user = await verifyRevaAdminPermissions();

    if (!reference) {
      throw "Reference is not valid.";
    }

    const property = await prisma.oneTimeUserProperty.findUnique({
      where: { reference },
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
      approvedAt: new Date().toISOString(),
      approvedBy: user.email,
    };

    console.log("\n\n\n\n\n");
    console.log(property?.email, updatedReport);
    console.log("\n\n\n\n\n");

    const result = await prisma.oneTimeUserProperty.update({
      where: { reference },
      data: {
        report: updatedReport,
        status: isApproved ? "Completed" : "Processing",
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
        link: string = "/reva/onetimerequest"
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
              <a href="${process.env.ONLINE_BASE_URL
          }${normalizedLink}?reference=${reference}&email=${encodeURIComponent(
            property.email
          )}"
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
              You can now view or download your report using the link above.
            </p>

            <p style="font-size: 14px; color: #6b7280;">Thank you for using our platform.</p>
          </div>
        </div>
      `;
      };

      await sendMail({
        to: process.env?.EMAIL_USER || "",
        subject: `[Super Admin] OneTime Due Diligence Report ${isApproved ? "Approved" : "Disapproved"
          }`,
        text: `Hello Super Admin,\n\nThe OneTime due diligence report for property ${reference} has been ${statusText}.`,
        html: mailTemplate(
          isApproved ? "Approved" : "Disapproved",
          `<p style='font-size: 16px;'>Hello <strong>Super Admin</strong>,</p>`,
          `The OneTime due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
          "/reva-restricted"
        ),
      });

      // Send email to all admins
      await sendEmailToAllAdmins({
        subject: `[Admin] OneTime Due Diligence Report ${isApproved ? "Approved" : "Disapproved"
          }`,
        text: `Hello Admin,\n\nThe OneTime due diligence report for property ${reference} has been ${statusText}.`,
        html: mailTemplate(
          isApproved ? "Approved" : "Disapproved",
          `<p style='font-size: 16px;'>Hello <strong>Admin</strong>,</p>`,
          `The OneTime due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
          "/reva-restricted"
        ),
      });

      // Send email to OneTime user
      if (isApproved && property?.email) {
        await sendMail({
          to: property.email,
          subject: `REVA: Your OneTime Due Diligence Report is Ready`,
          text: `Hello,\n\nYour OneTime due diligence report for property ${reference} has been approved and is now available.`,
          html: mailTemplate(
            "Approved",
            `<p style='font-size: 16px;'>Hello <strong>${property?.requester || "User"
            }</strong>,</p>`,
            `Your OneTime due diligence report for <strong>property #${reference}</strong> has been successfully approved.`
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

    // Trigger notifications
    try {
      if (isApproved) {
        // Notify OneTime user that report is ready
        // await notifyReportReady(property);
        // // Notify admins about approved report
        // await notifySystemAlert(
        //   "OneTime Report Approved",
        //   `OneTime due diligence report for property ${reference} has been approved by ${user.email}`,
        //   []
        // );
      } else {
        // // Notify admins about disapproved report
        // await notifySystemAlert(
        //   "OneTime Report Disapproved",
        //   `OneTime due diligence report for property ${reference} has been disapproved by ${user.email}`,
        //   []
        // );
      }
    } catch (error) {
      console.error("Error creating notifications:", error);
      warnings.push("Notifications not sent");
    }

    return {
      success: true,
      warnings,
      data: result,
      message: `OneTime report ${isApproved ? "approved" : "rejected"
        } successfully`,
    };
  } catch (error) {
    console.error(
      "\n\n\n\nError approving OneTime due diligence report : ",
      reference,
      error
    );
    return { error: error, success: false };
  }
};

// ===== NEW REVAUSER-BASED ADMIN MANAGEMENT FUNCTIONS =====

export const createAdminUser = async (formData: FormData) => {
  try {
    await verifyRevaSuperAdminPermissions();

    const email = formData.get("email") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const role = formData.get("role") as "ADMIN" | "SUPERADMIN";

    if (!email || !firstName || !lastName || !role) {
      return { success: false, error: "All fields are required" };
    }

    // Prevent operations on dev email
    if (email === process.env.DEV_EMAIL) {
      return { success: false, error: "Cannot modify dev account" };
    }

    const existingUser = await prisma.revaUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    const newUser = await prisma.revaUser.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        emailVerified: true,
        is_active: true,
        kindeId: `REVA_ADMIN_KINDE_ID_${Date.now()}__${Math.random()
          .toString(36)
          .substring(2, 11)}`,
      },
    });

    revalidatePath("/reva-restricted/dashboard/superadmin");

    // Notify superadmins about new admin creation
    try {
      await notifySystemAlert(
        "Admin User Created",
        `A new ${role} (${firstName} ${lastName}, ${email}) was created by a superadmin.
         You can manage admin users in the Super Admin dashboard.`,
        []
      );
      // Email all superadmins
      await sendEmailToAllSuperAdmins({
        subject: `REVA: New ${role} Created`,
        text: `A new ${role} (${firstName} ${lastName}, ${email}) was created by a superadmin.`,
        html: `<p>A new <b>${role}</b> (<b>${firstName} ${lastName}</b>, <b>${email}</b>) was created by a superadmin.<br>You can manage admin users in the Super Admin dashboard.</p>`,
      });
      // Email the user who was created
      if (email) {
        await sendMail({
          to: email,
          subject: `REVA: Your ${role} account has been created`,
          text: `Hello ${firstName},\n\nCongratulations! Your account has been created as a ${role} on the REVA platform. You now have access to admin features.`,
          html: `<p>Hello <b>${firstName}</b>,<br><br>Congratulations! Your account has been created as a <b>${role}</b> on the REVA platform. You now have access to admin features.<br><br>Best regards,<br>The REVA Team</p>`,
        });
      }
    } catch (error) {
      console.error("Error creating notification for admin creation:", error);
    }

    return {
      success: true,
      message: `${role} user created successfully`,
      data: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
    };
  } catch (error) {
    console.error("Error creating admin user:", error);
    return { success: false, error: "Failed to create admin user" };
  }
};

export const getAllAdminUsers = async () => {
  try {
    await verifyRevaSuperAdminPermissions();

    const adminUsers = await prisma.revaUser.findMany({
      where: {
        role: {
          in: ["ADMIN", "SUPERADMIN"],
        },
        email: {
          not: process.env.DEV_EMAIL,
        },
      },
      include: {
        _count: {
          select: {
            properties: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: adminUsers,
    };
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return { success: false, error: "Failed to fetch admin users" };
  }
};

export const getAllUsers = async () => {
  try {
    await verifyRevaSuperAdminPermissions();

    const allUsers = await prisma.revaUser.findMany({
      where: {
        email: {
          not: process.env.DEV_EMAIL,
        },
      },
      include: {
        _count: {
          select: {
            properties: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const admins = allUsers.filter(
      (user) => user.role === "ADMIN" || user.role === "SUPERADMIN"
    );
    const regularUsers = allUsers.filter((user) => user.role === "USER");

    return {
      success: true,
      data: {
        allUsers,
        admins,
        regularUsers,
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
};

export const makeUserAdmin = async (
  userId: string,
  role: "ADMIN" | "SUPERADMIN"
) => {
  try {
    await verifyRevaSuperAdminPermissions();

    const user = await prisma.revaUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Prevent operations on dev email
    if (user.email === process.env.DEV_EMAIL) {
      return { success: false, error: "Cannot modify dev account" };
    }

    if (user.role === "ADMIN" || user.role === "SUPERADMIN") {
      return { success: false, error: "User is already an admin" };
    }

    const updatedUser = await prisma.revaUser.update({
      where: { id: userId },
      data: {
        role,
        is_active: true,
      },
    });

    revalidatePath("/reva-restricted/dashboard/superadmin");

    // Notify superadmins about user promotion
    try {
      await notifySystemAlert(
        "User Promoted to Admin",
        `User ${user?.firstName || ""} ${user?.lastName || ""} (${user?.email
        }) was promoted to ${role} by a superadmin.
         You can manage admin users in the Super Admin dashboard.`,
        []
      );
      // Email all superadmins
      await sendEmailToAllSuperAdmins({
        subject: `REVA: User Promoted to ${role}`,
        text: `User ${user?.firstName || ""} ${user?.lastName || ""} (${user?.email
          }) was promoted to ${role} by a superadmin.`,
        html: `<p>User <b>${user?.firstName || ""} ${user?.lastName || ""
          }</b> (<b>${user?.email
          }</b>) was promoted to <b>${role}</b> by a superadmin.<br>You can manage admin users in the Super Admin dashboard.</p>`,
      });
      // Email the user who was promoted
      if (user?.email) {
        await sendMail({
          to: user.email,
          subject: `REVA: You have been promoted to ${role}`,
          text: `Hello ${user?.firstName || ""
            },\n\nCongratulations! You have been promoted to ${role} on the REVA platform. You now have access to admin features.`,
          html: `<p>Hello <b>${user?.firstName || ""
            }</b>,<br><br>Congratulations! You have been promoted to <b>${role}</b> on the REVA platform. You now have access to admin features.<br><br>Best regards,<br>The REVA Team</p>`,
        });
      }
    } catch (error) {
      console.error("Error creating notification for admin promotion:", error);
    }

    return {
      success: true,
      message: `User upgraded to ${role} successfully`,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error making user admin:", error);
    return { success: false, error: "Failed to make user admin" };
  }
};

export const removeAdminPrivileges = async (userId: string) => {
  try {
    await verifyRevaSuperAdminPermissions();

    const user = await prisma.revaUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Prevent operations on dev email
    if (user.email === process.env.DEV_EMAIL) {
      return { success: false, error: "Cannot modify dev account" };
    }

    if (user.role === "USER") {
      return { success: false, error: "User is not an admin" };
    }

    const updatedUser = await prisma.revaUser.update({
      where: { id: userId },
      data: {
        role: "USER",
      },
    });

    revalidatePath("/reva-restricted/dashboard/superadmin");

    return {
      success: true,
      message: "Admin privileges removed successfully",
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    return { success: false, error: "Failed to remove admin privileges" };
  }
};

export const deactivateUser = async (userId: string) => {
  try {
    await verifyRevaSuperAdminPermissions();

    const user = await prisma.revaUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Prevent operations on dev email
    if (user.email === process.env.DEV_EMAIL) {
      return { success: false, error: "Cannot modify dev account" };
    }

    if (!user.is_active) {
      return { success: false, error: "User is already deactivated" };
    }

    const updatedUser = await prisma.revaUser.update({
      where: { id: userId },
      data: {
        is_active: false,
      },
    });

    revalidatePath("/reva-restricted/dashboard/superadmin");

    return {
      success: true,
      message: "User deactivated successfully",
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error deactivating user:", error);
    return { success: false, error: "Failed to deactivate user" };
  }
};

export const reactivateUser = async (userId: string) => {
  try {
    await verifyRevaSuperAdminPermissions();

    const user = await prisma.revaUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Prevent operations on dev email
    if (user.email === process.env.DEV_EMAIL) {
      return { success: false, error: "Cannot modify dev account" };
    }

    if (user.is_active) {
      return { success: false, error: "User is already active" };
    }

    const updatedUser = await prisma.revaUser.update({
      where: { id: userId },
      data: {
        is_active: true,
      },
    });

    revalidatePath("/reva-restricted/dashboard/superadmin");

    return {
      success: true,
      message: "User reactivated successfully",
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error reactivating user:", error);
    return { success: false, error: "Failed to reactivate user" };
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await verifyRevaSuperAdminPermissions();

    const user = await prisma.revaUser.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            properties: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Prevent operations on dev email
    if (user.email === process.env.DEV_EMAIL) {
      return { success: false, error: "Cannot modify dev account" };
    }

    if (user._count.properties > 0) {
      return {
        success: false,
        error: `Cannot delete user with ${user._count.properties} associated properties. Please reassign or delete the properties first.`,
      };
    }

    await prisma.revaUser.delete({
      where: { id: userId },
    });

    revalidatePath("/reva-restricted/dashboard/superadmin");

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
};
