// School email domain allowed to sign in with an emailed code.
// Change it here (it's shown on the login page and enforced on the server).
export const SCHOOL_EMAIL_DOMAIN = "stamaria.sti.edu.ph";

// Who a school email belongs to, from its format (the part before the @):
// students' have their student number, e.g. abelis.329720; faculty and staff
// use firstname.lastname, letters only, e.g. juan.delacruz. Anything else
// isn't decided by the email (null).
export function roleFromSchoolEmail(email: string): "STUDENT" | "FACULTY" | null {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  if (/\d/.test(local)) return "STUDENT";
  if (/^[a-z]+(?:-[a-z]+)*(?:\.[a-z]+(?:-[a-z]+)*)+$/.test(local)) return "FACULTY";
  return null;
}
