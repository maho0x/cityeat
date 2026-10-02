import "server-only";
import { Resend } from "resend";
import { OtpEmail } from "@/emails/otp-email";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOtpEmail(email: string, otp: string) {
  if (!resend) {
    // Dev fallback: no email provider configured.
    console.info(`[auth] OTP for ${email}: ${otp}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "City 食咩好 <noreply@example.com>",
    to: email,
    subject: `${otp} 是你的 City 食咩好 驗證碼`,
    react: <OtpEmail otp={otp} />,
  });
  if (error) {
    console.error("[auth] failed to send OTP email", error);
    throw new Error("EMAIL_SEND_FAILED");
  }
}
