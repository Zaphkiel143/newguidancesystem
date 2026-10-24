import nodemailer from "nodemailer";
import db from "./db";

// Appointment emails over SMTP

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

// Sign-in codes can only be delivered when SMTP is configured
export const emailConfigured = transporter !== null;

const FROM = process.env.SMTP_FROM ?? "E-Gabay STI <no-reply@egabay.local>";

// Every email is automated, so say so; replies go nowhere useful
const NO_REPLY_NOTE =
  "\n\n—\nThis is an automated message from E-Gabay. Please don't reply to this email. To reach the Guidance and Counseling Office, message them in E-Gabay or visit the office.";

export type EmailStatus = "SENT" | "LOGGED" | "FAILED";

// Never throws: a failed email must not undo the booking that triggered it
export async function sendEmail(
  to: string | null | undefined,
  subject: string,
  body: string,
  options: { logBody?: string } = {}
): Promise<EmailStatus | null> {
  if (!to) return null;

  let status: EmailStatus = "LOGGED";
  let error: string | null = null;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM,
        to,
        subject,
        text: body + NO_REPLY_NOTE,
        // Tells mail apps this is a bulk/automatic message (no auto-replies back)
        headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
      });
      status = "SENT";
    } catch (err) {
      status = "FAILED";
      error = String(err);
      console.error("[email] Failed to send:", err);
    }
  } else {
    console.log(`[email] (not sent, no SMTP configured) to=${to} subject="${subject}"\n${process.env.NODE_ENV === "production" ? options.logBody ?? body : body}`);
  }

  try {
    await db.emailLog.create({ data: { to, subject, body: options.logBody ?? body, status, error } });
  } catch (err) {
    console.error("[email] Failed to record email:", err);
  }
  return status;
}

export async function counselorEmails(): Promise<string[]> {
  const counselors = await db.user.findMany({ where: { role: "COUNSELOR", status: "ACTIVE" }, select: { email: true } });
  return counselors.map((c) => c.email).filter((e): e is string => Boolean(e));
}

// Appointment dates are calendar days stored as UTC midnight, so format in UTC
export function formatAppointmentWhen(date: Date, time: string) {
  const day = date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${day} at ${time}`;
}
