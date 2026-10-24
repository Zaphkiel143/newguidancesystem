import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Time-based one-time codes (RFC 6238), the 6-digit codes shown by Microsoft Authenticator

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newTotpSecret(): string {
  // 20 random bytes -> 32 base32 characters
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const v = BASE32.indexOf(ch);
    if (v < 0) throw new Error("Invalid secret");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(key: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(value).padStart(DIGITS, "0");
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

// Checks a code, allowing one step of clock drift either way
export function verifyTotp(secret: string, code: string, now = Date.now()): number | null {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== DIGITS) return null;
  const key = base32Decode(secret);
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    const expected = codeAt(key, s);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(digits))) return s;
  }
  return null;
}

// What the authenticator app reads from the QR code
export function totpUri(secret: string, accountName: string, issuer = "E-Gabay STI") {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
