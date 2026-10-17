import React from "react";
import { Mail, MessageCircle, Phone, Smartphone } from "lucide-react";
import { SCHOOL_EMAIL_DOMAIN } from "../app/config/school";
import { formatPhone } from "../lib/phone";

// Quick ways for the Guidance Associate to reach someone: Outlook email and a
// Teams chat for school accounts, a regular email link otherwise, and call or
// text when there's a mobile number.
export default function ContactLinks({
  name,
  email,
  phone,
  subject,
}: {
  name: string;
  email: string | null | undefined;
  phone: string | null | undefined;
  subject: string;
}) {
  const isSchool = Boolean(email && email.toLowerCase().endsWith(`@${SCHOOL_EMAIL_DOMAIN}`));
  const link = "inline-flex items-center gap-1.5 px-3 min-h-9 rounded-full border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-[12px] font-medium text-slate-700";

  if (!email && !phone) {
    return <p className="text-[12px] text-slate-500">No email or mobile number on file for {name}.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`Contact ${name}`}>
      {email && (
        <a
          className={link}
          target="_blank"
          rel="noopener noreferrer"
          href={
            isSchool
              ? `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`
              : `mailto:${email}?subject=${encodeURIComponent(subject)}`
          }
          title={email}
        >
          <Mail size={13} /> {isSchool ? "Email (Outlook)" : "Email"}
        </a>
      )}
      {email && isSchool && (
        <a className={link} target="_blank" rel="noopener noreferrer" href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`}>
          <MessageCircle size={13} /> Teams chat
        </a>
      )}
      {phone && (
        <>
          <a className={link} href={`tel:${phone}`} title={formatPhone(phone)}>
            <Phone size={13} /> Call {formatPhone(phone)}
          </a>
          <a className={link} href={`sms:${phone}`}>
            <Smartphone size={13} /> Text
          </a>
        </>
      )}
    </div>
  );
}
