// What the person who made a referral sees about it on their My Referrals
// page. The Guidance Associate's internal notes are deliberately left out: they
// are confidential to the guidance office. "feedback" is what she chose to send
// back with "Send Feedback".
export const REFERRER_REFERRAL_FIELDS = {
  id: true,
  studentName: true,
  concernType: true,
  priority: true,
  description: true,
  status: true,
  feedback: true,
  feedbackAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
