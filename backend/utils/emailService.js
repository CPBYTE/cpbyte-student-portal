import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

/**
 * Sends a password reset email using nodemailer if SMTP configured,
 * or via Ethereal test inbox / console log fallback.
 * @param {string} email - Destination email address
 * @param {string} resetLink - Password reset link with token
 * @param {string} userName - Name of user
 */
export const sendPasswordResetEmail = async (email, resetLink, userName = "User") => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

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

  // 1. If SMTP configurations are present in .env, send real email via configured SMTP
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const port = Number(SMTP_PORT) || 465;
      const isSecure = port === 465;

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: port,
        secure: isSecure,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      });

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
      console.error("[Email Error] Failed to send email via custom SMTP:", err.message);
    }
  }

  // 2. Fallback to Ethereal Test Account if real SMTP credentials are missing
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
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

