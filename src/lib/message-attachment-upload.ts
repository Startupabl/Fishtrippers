import { supabase } from "@/integrations/supabase/client";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "txt", "xls", "xlsx", "csv", "jpg", "jpeg", "png",
] as const;

export const ALLOWED_MIMES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

export interface UploadedAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) return "File is larger than 5MB.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return "File type not allowed.";
  }
  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    return "File type not allowed.";
  }
  return null;
}

export async function uploadMessageAttachment(
  file: File,
  threadId: string,
): Promise<UploadedAttachment> {
  const err = validateAttachment(file);
  if (err) throw new Error(err);
  const ext = file.name.split(".").pop()!.toLowerCase();
  const uuid = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${threadId}/${uuid}.${ext}`;
  const { error } = await supabase.storage
    .from("message-attachments")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `application/octet-stream`,
    });
  if (error) throw new Error(error.message);
  // Bucket is private — store the storage path; consumers request a
  // short-lived signed URL via getMessageAttachmentSignedUrl().
  return {
    url: path,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
  };
}

export function getMessageAttachmentPath(urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const marker = "/message-attachments/";
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return urlOrPath;
  return urlOrPath.slice(idx + marker.length).split("?")[0];
}

export async function getMessageAttachmentSignedUrl(
  urlOrPath: string,
  expiresInSeconds = 60,
): Promise<string | null> {
  const path = getMessageAttachmentPath(urlOrPath);
  const { data, error } = await supabase.storage
    .from("message-attachments")
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
