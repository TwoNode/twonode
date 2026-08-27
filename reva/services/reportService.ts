import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { deleteManyFromS3, uploadToS3FromServer } from "@/app/(projects)/reva/actions/awsActions";
import { sendMail, sendEmailToAllAdmins } from "@/utils/email";
import { notifyReportReady, notifySystemAlert } from "@/reva/services/notificationService";

/**
 * Migrated from reva-restricted/actions/adminDbActions.ts's report-review
 * functions — admin listing/inspection of requests plus due-diligence
 * report upload/approval, for both Property (authenticated) and
 * OneTimeUserProperty (guest) rows. verifyRevaAdminPermissions/
 * verifyRevaSuperAdminPermissions fold into withAuth's role check at the
 * route layer, same as every other product; revalidatePath drops (no
 * next/cache in services, §Phase-1 pattern).
 */

const AVAILABLE = "Available";
const COMPLETED = "Completed";
const PROCESSING = "Processing";

export async function getAllRequestsWithUserByAdmin({
  limit,
  onlyWithReport = false,
  includeOneTimeRequests = false,
}: {
  limit?: number;
  onlyWithReport?: boolean;
  includeOneTimeRequests?: boolean;
} = {}) {
  const reportFilter = onlyWithReport ? { report: { not: Prisma.JsonNull as any } } : undefined;

  const properties = await prisma.property.findMany({
    take: limit,
    where: reportFilter,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, kindeId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const oneTimeRequests = includeOneTimeRequests
    ? await prisma.oneTimeUserProperty.findMany({
        take: limit,
        where: reportFilter,
        orderBy: { updatedAt: "desc" },
      })
    : null;

  return { properties, oneTimeRequests };
}

export async function getRequestByReferenceByAdmin(reference: string) {
  const request = await prisma.property.findUnique({
    where: { reference },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, kindeId: true } },
    },
  });
  if (!request) throw new NotFoundError("Request");
  return request;
}

export async function getOneTimeRequestByReferenceByAdmin(reference: string) {
  const request = await prisma.oneTimeUserProperty.findUnique({ where: { reference } });
  if (!request) throw new NotFoundError("OneTime request");
  return request;
}

/**
 * The admin `/admin/requests/:reference` route doesn't know up front which
 * table a reference belongs to (Property references start `REVA_`,
 * OneTimeUserProperty ones `reva_`, but that's a DB default, not a
 * guarantee) — this resolves it server-side, checking Property first since
 * it's the more common admin-review case.
 */
export async function getAnyRequestByReferenceForAdmin(reference: string) {
  const property = await prisma.property.findUnique({
    where: { reference },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, kindeId: true } },
    },
  });
  if (property) return { type: "property" as const, data: property };

  const oneTime = await prisma.oneTimeUserProperty.findUnique({ where: { reference } });
  if (oneTime) return { type: "oneTime" as const, data: oneTime };

  throw new NotFoundError("Request");
}

async function uploadFilesToS3AndUpdateReport(
  filesMap: { key: string; file: File }[],
  report: Record<string, any>,
  reference: string
) {
  await Promise.all(
    filesMap.map(async (f) => {
      try {
        const uploadedUrl = await uploadToS3FromServer([f.file], reference);
        report.images[f.key] = uploadedUrl[0];
      } catch (error) {
        console.warn(`[reportService] ${f.key}: file was not uploaded`, error);
      }
    })
  );
}

export async function uploadDueDiligenceReport(formData: FormData, adminEmail: string) {
  const warnings: string[] = [];

  const reference = formData.get("reference") as string;
  if (!reference) throw new ValidationError({ reference: "Missing property reference" });

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

  const replacedImageUrls: string[] = [];
  filesMap.forEach(({ key }) => {
    if (prevImages?.[key]) replacedImageUrls.push(prevImages[key]);
  });

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
      hasBuildingPlanApproval: formData.get("hasBuildingPlanApproval") === "true",
      buildingPlanNo: formData.get("buildingPlanNo"),
      setbacksInfo: formData.get("setbacksInfo"),
      images: prevImages,
    }).filter(
      ([, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
    )
  );

  await uploadFilesToS3AndUpdateReport(filesMap, report, reference);

  if (replacedImageUrls.length > 0) {
    try {
      await deleteManyFromS3(replacedImageUrls.map((url) => ({ url })));
    } catch (error) {
      console.warn("[reportService] failed to delete some replaced images", error);
    }
  }

  const existingProperty = await prisma.property.findUnique({ where: { reference } });
  if (!existingProperty) throw new NotFoundError("Property");

  const previousReport =
    existingProperty.report && typeof existingProperty.report === "object" ? existingProperty.report : {};

  const result = await prisma.property.update({
    where: { reference },
    data: { status: COMPLETED, report: { ...previousReport, ...report } },
  });

  try {
    await sendMail({
      to: process.env.EMAIL_USER || "",
      subject: "Due Diligence Report Update",
      text: "The due diligence report has been updated successfully, please review the report.",
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #4CAF50;">Due Diligence Report Update</h2><p>Dear User,</p><p>The due diligence report has been updated successfully. Please review the report at your earliest convenience.</p><p>Thank you for your attention.</p><p style="margin-top: 20px;">Best regards,</p><p><strong>REVA Team</strong></p></div>`,
    });
  } catch (err) {
    console.warn("[reportService] Email not sent:", err);
    warnings.push("Email not sent");
  }

  try {
    await notifySystemAlert(
      "Report Uploaded",
      `Due diligence report for property ${reference} has been uploaded by ${adminEmail}.`
    );
  } catch (error) {
    console.warn("[reportService] Notification not sent:", error);
    warnings.push("Notification not sent");
  }

  return { data: result, warnings };
}

export async function uploadDirectLinkReport(formData: FormData, adminEmail: string) {
  const warnings: string[] = [];

  const reference = formData.get("reference") as string;
  const isOneTimeRequest = formData.get("isOneTimeRequest") === "true";
  if (!reference) throw new ValidationError({ reference: "Missing property reference" });

  const file = formData.get("directLink");
  if (!file || !(file instanceof File)) {
    throw new ValidationError({ directLink: "Missing or invalid file" });
  }

  if (isOneTimeRequest) {
    const existingRequest = await prisma.oneTimeUserProperty.findUnique({ where: { reference } });
    if (!existingRequest) throw new NotFoundError("OneTime request");

    const directFileLink = await uploadToS3FromServer([file], reference, { useDirectFileName: true });

    const previousReport =
      existingRequest.report && typeof existingRequest.report === "object" ? existingRequest.report : {};

    const report = {
      ...previousReport,
      directFileLink,
      completedAt: new Date().toISOString(),
      completedBy: adminEmail,
    };

    const result = await prisma.oneTimeUserProperty.update({
      where: { reference },
      data: { status: COMPLETED, report },
    });

    try {
      await sendMail({
        to: existingRequest.email,
        subject: "Your Due Diligence Report is Ready",
        text: `Your due diligence report for request ${reference} is now available for download.`,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #4CAF50;">Your Due Diligence Report is Ready</h2><p>Dear ${
          existingRequest.requester || "Valued Customer"
        },</p><p>Your due diligence report for request <strong>${reference}</strong> is now available for download.</p><p>You can download your report by clicking the link below:</p><p><a href="${
          process.env.ONLINE_BASE_URL
        }/reva/onetimerequest?reference=${reference}&email=${encodeURIComponent(
          existingRequest.email
        )}" style="color: #1e40af; text-decoration: underline;">Download Report</a></p><p>Thank you for using our service.</p><p style="margin-top: 20px;">Best regards,</p><p><strong>REVA Team</strong></p></div>`,
      });
    } catch (err) {
      console.warn("[reportService] Email not sent:", err);
      warnings.push("Email not sent");
    }

    try {
      await notifySystemAlert(
        "One-Time Request Report Uploaded",
        `Report for one-time request ${reference} has been uploaded by ${adminEmail}.`
      );
    } catch (error) {
      console.warn("[reportService] Notification not sent:", error);
      warnings.push("Notification not sent");
    }

    return { data: result, warnings };
  }

  const existingProperty = await prisma.property.findUnique({ where: { reference }, include: { user: true } });
  if (!existingProperty) throw new NotFoundError("Property");

  const directFileLink = await uploadToS3FromServer([file], reference, { useDirectFileName: true });

  const previousReport =
    existingProperty.report && typeof existingProperty.report === "object" ? existingProperty.report : {};

  const report = {
    ...previousReport,
    directFileLink,
    completedAt: new Date().toISOString(),
    completedBy: adminEmail,
  };

  const result = await prisma.property.update({
    where: { reference },
    data: { status: COMPLETED, report },
  });

  try {
    await sendMail({
      to: process.env.EMAIL_USER || "",
      subject: "Due Diligence Report Update",
      text: "The due diligence report has been updated successfully, please review the report.",
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #4CAF50;">Due Diligence Report Update</h2><p>Dear User,</p><p>The due diligence report has been updated successfully. Please review the report at your earliest convenience.</p><p>Thank you for your attention.</p><p style="margin-top: 20px;">Best regards,</p><p><strong>REVA Team</strong></p></div>`,
    });
  } catch (err) {
    console.warn("[reportService] Email not sent:", err);
    warnings.push("Email not sent");
  }

  try {
    await notifySystemAlert(
      "Direct Link Report Uploaded",
      `Direct link report for property ${reference} has been uploaded by ${adminEmail}.`
    );
  } catch (error) {
    console.warn("[reportService] Notification not sent:", error);
    warnings.push("Notification not sent");
  }

  return { data: result, warnings };
}

/** `path` is the full path+query (caller builds `?reference=`/`&email=` as needed — the one-time guest link needs both, the others need just `?reference=`). */
function reportMailTemplate(opts: { title: string; greeting: string; body: string; reference: string; path: string }) {
  const logoDisplay = `<div style="background-color: #1e40af; background-image: linear-gradient(to right, #00000020, #ffffff); width: 100%;"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; background-image: linear-gradient(to right, #00000020, #ffffff); padding: 16px 0;"><tr><td align="center"><img src="${process.env.ONLINE_BASE_URL}/logo.png" alt="TwoNode Technologies" style="height: 48px; max-width: 40%; margin-right: 8px;" /><img src="${process.env.ONLINE_BASE_URL}/reva/revaLogo.png" alt="REVA Logo" style="height: 48px; max-width: 40%;" /></td></tr></table></div>`;

  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">${logoDisplay}<div style="background-color: #1e40af; background-image: linear-gradient(to right, #1e40af, #111827); padding: 24px; text-align: center; color: white;"><h2 style="margin: 0; font-size: 24px;">🎉 Report ${
    opts.title
  }!</h2><p style="margin: 8px 0 0; font-size: 16px;">Reference: #${opts.reference}</p></div><div style="padding: 24px; background-color: #f9fafb; color: #374151;">${
    opts.greeting
  }<p>${opts.body}</p><div style="margin: 30px 0; text-align: center;"><a href="${
    process.env.ONLINE_BASE_URL
  }${opts.path}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Report</a></div><p style="font-size: 16px;">You can now view or download your report from the dashboard.</p><p style="font-size: 14px; color: #6b7280;">Thank you for using our platform.</p></div></div>`;
}

export async function approveDueDiligenceReport(reference: string, isApproved: boolean, adminEmail: string) {
  const warnings: string[] = [];
  if (!reference) throw new ValidationError({ reference: "Reference is required" });

  const property = await prisma.property.findUnique({
    where: { reference },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, kindeId: true } },
    },
  });

  if (!property || !property.report || typeof property.report !== "object") {
    throw new NotFoundError("Property or report");
  }

  const updatedReport = {
    ...(typeof property.report === "object" ? property.report : {}),
    isApproved,
    approvedAt: new Date().toISOString(),
    approvedBy: adminEmail,
  };

  const result = await prisma.property.update({
    where: { reference },
    data: { report: updatedReport, status: isApproved ? AVAILABLE : PROCESSING },
  });

  const statusText = isApproved ? "approved" : "disapproved";

  try {
    await sendMail({
      to: process.env.EMAIL_USER || "",
      subject: `[Super Admin] Due Diligence Report ${isApproved ? "Approved" : "Disapproved"}`,
      text: `Hello Super Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}.`,
      html: reportMailTemplate({
        title: isApproved ? "Approved" : "Disapproved",
        greeting: `<p style='font-size: 16px;'>Hello <strong>Super Admin</strong>,</p>`,
        body: `The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
        reference,
        path: `/reva-restricted/dashboard/viewdetails?reference=${reference}`,
      }),
    });

    await sendEmailToAllAdmins({
      subject: `[Admin] Due Diligence Report ${isApproved ? "Approved" : "Disapproved"}`,
      text: `Hello Admin,\n\nThe due diligence report for property ${reference} has been ${statusText}.`,
      html: reportMailTemplate({
        title: isApproved ? "Approved" : "Disapproved",
        greeting: `<p style='font-size: 16px;'>Hello <strong>Admin</strong>,</p>`,
        body: `The due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
        reference,
        path: `/reva-restricted/dashboard/viewdetails?reference=${reference}`,
      }),
    });

    if (isApproved && property.user?.email) {
      await sendMail({
        to: property.user.email,
        subject: `REVA: Your Due Diligence Report is Ready`,
        text: `Hello,\n\nYour due diligence report for property ${reference} has been approved and is now available in your dashboard.`,
        html: reportMailTemplate({
          title: "Approved",
          greeting: `<p style='font-size: 16px;'>Hello <strong>${property.user.firstName || "User"}</strong>,</p>`,
          body: `Your due diligence report for <strong>property #${reference}</strong> has been successfully approved.`,
          reference,
          path: `/reva/dashboard/viewdetails?reference=${reference}`,
        }),
      });
    }
  } catch (err) {
    console.warn("[reportService] Email not sent:", err);
    warnings.push("Email not sent");
  }

  try {
    if (isApproved) {
      if (property.user?.id) {
        await notifyReportReady(property, property.user.id);
      }
      await notifySystemAlert(
        "Report Approved",
        `Due diligence report for property ${reference} has been approved by ${adminEmail}`
      );
    } else {
      await notifySystemAlert(
        "Report Disapproved",
        `Due diligence report for property ${reference} has been disapproved by ${adminEmail}`
      );
    }
  } catch (error) {
    console.warn("[reportService] Notifications not sent:", error);
    warnings.push("Notifications not sent");
  }

  return { data: result, warnings, message: `Report ${isApproved ? "approved" : "rejected"} successfully` };
}

/**
 * The OneTimeUserProperty notification block was entirely commented out in
 * the source (resolved Phase 3 decision #1) — now wired to the real
 * email-keyed `notifyReportReady`/`notifySystemAlert` path built in
 * notificationService.ts, mirroring the sibling regular-Property function
 * above instead of leaving guests silently un-notified in-app.
 */
export async function approveOneTimeDueDiligenceReport(reference: string, isApproved: boolean, adminEmail: string) {
  const warnings: string[] = [];
  if (!reference) throw new ValidationError({ reference: "Reference is required" });

  const property = await prisma.oneTimeUserProperty.findUnique({ where: { reference } });

  if (!property || !property.report || typeof property.report !== "object") {
    throw new NotFoundError("Property or report");
  }

  const updatedReport = {
    ...(typeof property.report === "object" ? property.report : {}),
    isApproved,
    approvedAt: new Date().toISOString(),
    approvedBy: adminEmail,
  };

  const result = await prisma.oneTimeUserProperty.update({
    where: { reference },
    data: { report: updatedReport, status: isApproved ? COMPLETED : PROCESSING },
  });

  const statusText = isApproved ? "approved" : "disapproved";

  try {
    await sendMail({
      to: process.env.EMAIL_USER || "",
      subject: `[Super Admin] OneTime Due Diligence Report ${isApproved ? "Approved" : "Disapproved"}`,
      text: `Hello Super Admin,\n\nThe OneTime due diligence report for property ${reference} has been ${statusText}.`,
      html: reportMailTemplate({
        title: isApproved ? "Approved" : "Disapproved",
        greeting: `<p style='font-size: 16px;'>Hello <strong>Super Admin</strong>,</p>`,
        body: `The OneTime due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
        reference,
        path: `/reva-restricted/dashboard/viewdetails?reference=${reference}`,
      }),
    });

    await sendEmailToAllAdmins({
      subject: `[Admin] OneTime Due Diligence Report ${isApproved ? "Approved" : "Disapproved"}`,
      text: `Hello Admin,\n\nThe OneTime due diligence report for property ${reference} has been ${statusText}.`,
      html: reportMailTemplate({
        title: isApproved ? "Approved" : "Disapproved",
        greeting: `<p style='font-size: 16px;'>Hello <strong>Admin</strong>,</p>`,
        body: `The OneTime due diligence report for property <strong>${reference}</strong> has been <strong>${statusText}</strong>.`,
        reference,
        path: `/reva-restricted/dashboard/viewdetails?reference=${reference}`,
      }),
    });

    if (isApproved && property.email) {
      await sendMail({
        to: property.email,
        subject: `REVA: Your OneTime Due Diligence Report is Ready`,
        text: `Hello,\n\nYour OneTime due diligence report for property ${reference} has been approved and is now available.`,
        html: reportMailTemplate({
          title: "Approved",
          greeting: `<p style='font-size: 16px;'>Hello <strong>${property.requester || "User"}</strong>,</p>`,
          body: `Your OneTime due diligence report for <strong>property #${reference}</strong> has been successfully approved.`,
          reference,
          path: `/reva/onetimerequest?reference=${reference}&email=${encodeURIComponent(property.email)}`,
        }),
      });
    }
  } catch (err) {
    console.warn("[reportService] Email not sent:", err);
    warnings.push("Email not sent");
  }

  try {
    if (isApproved) {
      await notifyReportReady(result);
    } else {
      await notifySystemAlert(
        "OneTime Report Disapproved",
        `OneTime due diligence report for property ${reference} has been disapproved by ${adminEmail}`
      );
    }
  } catch (error) {
    console.warn("[reportService] Notifications not sent:", error);
    warnings.push("Notifications not sent");
  }

  return {
    data: result,
    warnings,
    message: `OneTime report ${isApproved ? "approved" : "rejected"} successfully`,
  };
}
