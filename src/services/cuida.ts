import { supabase } from "./supabase";

export type Attachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};
export type Proposal = {
  id: string;
  kind: "commitment" | "task";
  title: string;
  description?: string;
  starts_at?: string | null;
  due_at?: string | null;
  ends_at?: string | null;
  reminder_minutes?: number | null;
  assignee?: string | null;
  assigned_to?: string | null;
  care_profile_id?: string | null;
};
export type Reply = {
  reply: string;
  proposals: Proposal[];
  message_id?: string;
  assistant_message_id: string;
};

export async function invokeCuida<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cuida", { body });
  if (error) {
    const response =
      "context" in error
        ? (error as { context?: Response }).context
        : undefined;
    const payload = response
      ? await response
          .clone()
          .json()
          .catch(() => null)
      : null;
    const failure = new Error(
      payload?.error ||
        error.message ||
        "Não foi possível conversar com a Cuida.",
    ) as Error & { code?: string; status?: number };
    failure.code = payload?.code;
    failure.status = response?.status;
    throw failure;
  }
  return data as T;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);
export function validateAttachment(file: File) {
  if (!TYPES.has(file.type))
    throw new Error(
      "Formato não suportado. Envie imagem, PDF, DOCX, TXT ou áudio.",
    );
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error("O limite é 10 MB por anexo.");
  if (file.size === 0) throw new Error("O anexo está vazio.");
}
export async function uploadCuidaFile(
  file: File,
  userId: string,
): Promise<Attachment> {
  validateAttachment(file);
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("cuida-private")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "0",
    });
  if (error)
    throw new Error(`Não foi possível enviar ${file.name}: ${error.message}`);
  return {
    path,
    name: file.name.slice(0, 160),
    type: file.type,
    size: file.size,
  };
}
