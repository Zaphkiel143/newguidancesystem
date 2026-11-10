// What the person who booked an appointment (student, faculty or parent) gets
// about it. The Guidance Associate's session notes are deliberately left out:
// they are confidential to the guidance office, and leaving them out here keeps
// them out of the booker's browser, not just off the screen.
export const BOOKER_APPOINTMENT_FIELDS = {
  id: true,
  date: true,
  time: true,
  studentName: true,
  appointmentType: true,
  status: true,
  rescheduled: true,
  originalDate: true,
  originalTime: true,
  cancelReason: true,
  requirements: true,
} as const;
