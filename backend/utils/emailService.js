import dotenv from "dotenv";
import nodemailer from "nodemailer";
import dns from "dns";
import axios from "axios";
dotenv.config();

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

/**
 * Sends a password reset email using Resend HTTPS API, Nodemailer SMTP, or fallback log.
 * @param {string} email - Destination email address
 * @param {string} resetLink - Password reset link with token
 * @param {string} userName - Name of user
 */
export const sendPasswordResetEmail = async (email, resetLink, userName = "User") => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    RESEND_API_KEY,
    BREVO_API_KEY,
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY,
  } = process.env;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #2563eb; text-align: center;">CPBYTE Student Portal</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We received a request to reset your password for your CPBYTE account. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #666;">This password reset link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
      <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
      </p>
    </div>
  `;

  // 1. Try EmailJS REST API (Port 443 HTTPS - Works natively on Render)
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
    try {
      const emailJsData = {
        service_id: EMAILJS_SERVICE_ID.trim(),
        template_id: EMAILJS_TEMPLATE_ID.trim(),
        user_id: EMAILJS_PUBLIC_KEY.trim(),
        ...(EMAILJS_PRIVATE_KEY && { accessToken: EMAILJS_PRIVATE_KEY.trim() }),
        template_params: {
          to_email: email,
          to_name: userName,
          reset_link: resetLink,
          email: email,
          name: userName,
        },
      };

      await axios.post("https://api.emailjs.com/api/v1.0/email/send", emailJsData, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      console.log(`[Email] Password reset email successfully sent via EmailJS API to ${email}`);
      return { success: true, method: "emailjs" };
    } catch (emailJsErr) {
      console.error("[Email Error] EmailJS API failed:", emailJsErr.response?.data || emailJsErr.message);
    }
  }

  // 1. Try SMTP (e.g. Gmail with App Password) if credentials exist in .env
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      let transportOptions;

      if (SMTP_HOST.toLowerCase().includes("gmail")) {
        transportOptions = {
          service: "gmail",
          family: 4,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        };
      } else {
        let port = Number(SMTP_PORT) || 465;
        if (port === 587) port = 465; 
        const isSecure = port === 465;

        transportOptions = {
          host: SMTP_HOST,
          port: port,
          secure: isSecure,
          family: 4,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        };
      }

      const transporter = nodemailer.createTransport(transportOptions);

      const mailOptions = {
        from: SMTP_FROM || `"CPBYTE Student Portal" <${SMTP_USER}>`,
        to: email,
        subject: "Password Reset Request - CPBYTE Student Portal",
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email] Password reset email successfully sent to ${email} (MessageID: ${info.messageId})`);
      return { success: true, method: "smtp", messageId: info.messageId };
    } catch (err) {
      console.error("[Email Error] Failed to send email via SMTP:", err.message);
    }
  }

  // 2. Try Brevo HTTPS REST API (Port 443)
  if (BREVO_API_KEY) {
    try {
      const res = await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: "CPBYTE Student Portal", email: SMTP_USER || "cpbyteportal@gmail.com" },
          to: [{ email: email, name: userName }],
          subject: "Password Reset Request - CPBYTE Student Portal",
          htmlContent: emailHtml,
        },
        {
          headers: {
            "api-key": BREVO_API_KEY.trim(),
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      console.log(`[Email] Reset email sent via Brevo HTTPS API to ${email} (MessageID: ${res.data?.messageId})`);
      return { success: true, method: "brevo", messageId: res.data?.messageId };
    } catch (brevoErr) {
      console.error("[Email Error] Brevo API failed:", brevoErr.response?.data || brevoErr.message);
    }
  }

  // 3. Try Resend HTTPS REST API (Port 443)
  if (RESEND_API_KEY) {
    try {
      const resendFrom = process.env.RESEND_FROM || "CPBYTE Portal <onboarding@resend.dev>";
      const res = await axios.post(
        "https://api.resend.com/emails",
        {
          from: resendFrom,
          to: [email],
          subject: "Password Reset Request - CPBYTE Student Portal",
          html: emailHtml,
        },
        {
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      console.log(`[Email] Reset email sent via Resend HTTPS API to ${email} (ID: ${res.data?.id})`);
      return { success: true, method: "resend", id: res.data?.id };
    } catch (resendErr) {
      console.error("[Email Error] Resend API failed:", resendErr.response?.data || resendErr.message);
    }
  }

  // 2. Fallback to Ethereal Test Account if real SMTP credentials are missing
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      family: 4,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
    });

    const info = await testTransporter.sendMail({
      from: `"CPBYTE Portal" <${testAccount.user}>`,
      to: email,
      subject: "Password Reset Request - CPBYTE Student Portal",
      html: emailHtml,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log("==========================================");
    console.log(`[Email Test Mode] Password Reset Email sent for ${email}`);
    console.log(`[Ethereal Preview URL]: ${previewUrl}`);
    console.log(`[Direct Reset Link]: ${resetLink}`);
    console.log("==========================================");

    return { success: true, method: "ethereal", previewUrl, resetLink };
  } catch (testErr) {
    console.error("[Email Test Error] Could not send via Ethereal:", testErr.message);
  }

  // 3. Fallback console output
  console.log("==========================================");
  console.log(`[DEV MODE] Password Reset Requested for ${email}`);
  console.log(`[DEV MODE] Reset Link: ${resetLink}`);
  console.log("==========================================");

  return { success: true, method: "console", resetLink };
};

