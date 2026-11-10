// The E-Gabay chatbot can't see anyone's records (it isn't connected to the
// database), so for "where do I…" and "what happened to my…" topics it tells
// the person where to look, and the chat shows a button to that page. Each
// link names the page for students and for faculty; a role without the page
// gets no button.

type Role = "student" | "faculty";
type ChatLink = { label: string; student?: string; faculty?: string };

const APPOINTMENTS: ChatLink = { label: "Open My Appointments", student: "/my_appointments", faculty: "/faculty_appointment" };
const REFERRALS: ChatLink = { label: "Open My Referrals", student: "/my_referrals", faculty: "/faculty_myreferral" };
const REFER: ChatLink = { label: "Submit a referral", student: "/refer_student", faculty: "/submit_referral" };
const DOCUMENTS: ChatLink = { label: "Open my documents", student: "/profile", faculty: "/upload_documents" };
const MESSAGES: ChatLink = { label: "Message the guidance office", student: "/my_messages", faculty: "/faculty_message" };
const ACCOUNT: ChatLink = { label: "Open my account settings", student: "/profile?tab=settings", faculty: "/faculty_account?tab=settings" };

const BY_INTENT: Record<string, ChatLink[]> = {
  book_appointment: [APPOINTMENTS],
  cancel_reschedule: [APPOINTMENTS],
  my_appointment_status: [APPOINTMENTS],
  referral_process: [REFER, REFERRALS],
  worried_about_someone: [REFER],
  my_referral_status: [REFERRALS],
  document_requirements: [DOCUMENTS],
  my_document_status: [DOCUMENTS],
  my_messages_status: [MESSAGES],
  seek_help: [APPOINTMENTS, MESSAGES],
  account_help: [ACCOUNT],
  career_question: [{ label: "Open the Career Planning Form", student: "/career_form" }],
};

export function chatbotLinks(intent: string | null | undefined, roleLabel: string) {
  if (!intent) return [];
  const role: Role = roleLabel === "Faculty" ? "faculty" : "student";
  return (BY_INTENT[intent] ?? [])
    .map((l) => ({ label: l.label, href: l[role] }))
    .filter((l): l is { label: string; href: string } => Boolean(l.href));
}
