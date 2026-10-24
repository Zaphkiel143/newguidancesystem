// Validates uploaded announcement photos by their actual bytes

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageCheck = { ok: true; type: string; bytes: Buffer } | { ok: false; error: string };

function sniff(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.length >= 6 && (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a")) return "image/gif";
  return null;
}

export function checkImage(dataBase64: string): ImageCheck {
  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length === 0) return { ok: false, error: "That photo is empty." };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "Photos must be 5 MB or smaller." };
  const type = sniff(bytes);
  if (!type) return { ok: false, error: "Use a JPG, PNG, WebP, or GIF photo." };
  return { ok: true, type, bytes };
}
