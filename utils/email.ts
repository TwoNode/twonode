import { createTransport } from "nodemailer";

export const sendEmailToAdmin = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
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
      from: process?.env?.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to admin: ", info.response);

    return { success: true, info };
  } catch (error) {
    console.error("Error sending email to admin:", error);
    return { success: false, error: "Failed to send email to admin" };
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendMail = async ({
  to,
  subject,
  text = "",
  html = "",
}: EmailOptions) => {
  try {
    const transporter = createTransport({
      service: "Zoho",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
    console.log("Email sent:", info.response);
    return { success: true, info };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

/**
 * Send email using Surfboard notification credentials (NOTIF_EMAIL)
 */
export const sendNotificationMail = async ({
  to,
  subject,
  text = "",
  html = "",
}: EmailOptions) => {
  try {
    const transporter = createTransport({
      service: "Zoho",
      auth: {
        user: process.env.NOTIF_EMAIL,
        pass: process.env.NOTIF_EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.NOTIF_EMAIL,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Surfboard email sent:", info.response);
    return { success: true, info };
  } catch (error) {
    console.error("Error sending Surfboard email:", error);
    return { success: false, error: "Failed to send Surfboard email" };
  }
};
