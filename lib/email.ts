import nodemailer from "nodemailer";
import db from "./db";

// Appointment emails over SMTP. Configure with:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM
// Without SMTP_HOST nothing is sent: the email is only recorded in EmailLog
// (status LOGGED) and printed to the server console, so a review copy can
// show exactly what would go out without mailing anyone.

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

// Sign-in codes can only be delivered when SMTP is configured.
export const emailConfigured = transporter !== null;

const FROM = process.env.SMTP_FROM ?? "E-Gabay STI <no-reply@egabay.local>";

export type EmailStatus = "SENT" | "LOGGED" | "FAILED";

// Never throws: a failed email must not undo the booking that triggered it.
// Pass logBody to keep secrets (e.g. sign-in codes) out of the EmailLog table.
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
      await transporter.sendMail({ from: FROM, to, subject, text: body });
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
  const counselors = await db.user.findMany({ where: { role: "COUNSELOR" }, select: { email: true } });
  return counselors.map((c) => c.email);
}

// Appointment dates are calendar days stored as UTC midnight, so format in UTC;
// otherwise a server in a timezone behind UTC would print the previous day.
export function formatAppointmentWhen(date: Date, time: string) {
  const day = date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${day} at ${time}`;
}
