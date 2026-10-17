// Philippine mobile numbers, stored one way (+639XXXXXXXXX) so "0917 123 4567",
// "+63 917 123 4567" and "639171234567" all match the same account.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (d.startsWith("09") && d.length === 11) d = `63${d.slice(1)}`;
  if (d.startsWith("9") && d.length === 10) d = `63${d}`;
  return /^639\d{9}$/.test(d) ? `+${d}` : null;
}

// "+639171234567" -> "0917 123 4567"
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const m = phone.match(/^\+63(9\d{2})(\d{3})(\d{4})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone;
}
