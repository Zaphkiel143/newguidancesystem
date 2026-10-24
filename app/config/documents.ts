// Kinds of documents students hand in to the guidance office (Individual Inventory)
export const STUDENT_DOCUMENT_CATEGORIES = [
  "Excuse letter",
  "Medical certificate",
  "Intent to wear gender-affirming clothing",
  "Exit interview form",
  "Parent consent form",
  "Other",
] as const;

export const ACCEPTED_FILE_TYPES = ".pdf,.docx,image/jpeg,image/png,image/webp";
