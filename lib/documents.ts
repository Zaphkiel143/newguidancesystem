// Checks every uploaded document by its actual bytes, not the name or the type
// the browser reports, so only real PDFs, Word files and photos are stored.
// Anything else (programs, web pages, archives, renamed files) is refused.

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export { STUDENT_DOCUMENT_CATEGORIES } from "../app/config/documents";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function detectFileType(b: Buffer): string | null {
  if (b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  // A .docx is a zip whose first entry is [Content_Types].xml and that has a word/ folder.
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    const head = b.subarray(0, Math.min(b.length, 64 * 1024)).toString("latin1");
    if (head.includes("[Content_Types].xml") && b.includes("word/document")) return DOCX;
  }
  return null;
}

export const EXTENSION_FOR: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  [DOCX]: ".docx",
};

export function isImageType(type: string) {
  return type.startsWith("image/");
}

export type DocumentCheck = { ok: true; type: string; bytes: Buffer; fileName: string } | { ok: false; error: string };

export function checkDocument(dataBase64: string, fileName: string, opts: { imagesOnly?: boolean } = {}): DocumentCheck {
  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length === 0) return { ok: false, error: "That file is empty." };
  if (bytes.length > MAX_DOCUMENT_BYTES) return { ok: false, error: "Files must be 5 MB or smaller." };
  const type = detectFileType(bytes);
  if (!type || (opts.imagesOnly && !isImageType(type))) {
    return { ok: false, error: opts.imagesOnly ? "Use a JPG, PNG or WebP photo." : "Use a PDF, Word (.docx) file, or a JPG/PNG photo." };
  }
  // Keep a readable name without folders or odd characters, with the right extension.
  const base = fileName.split(/[\\/]/).pop()!.replace(/\.[^.]*$/, "").replace(/[^\w\- ().,]/g, "").trim().slice(0, 80) || "document";
  return { ok: true, type, bytes, fileName: `${base}${EXTENSION_FOR[type]}` };
}
