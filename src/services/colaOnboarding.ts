import { supabase } from "./supabase";

export type CareKind = "child" | "adult" | "pet";
export type CareDraft = {
  key: string;
  name: string;
  kind: CareKind;
  category: "Criança" | "Adolescente" | "Pessoa idosa" | "Pet";
  createdId?: string;
};
export type InviteDraft = {
  key: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  careKeys: string[];
  status?: "sent" | "link";
  shareUrl?: string;
};
export type SetupAnswers = {
  identity: { name: string; role: string };
  priorities: string[];
  family: string;
  cared: CareDraft[];
  invited: InviteDraft[];
  calendar: { google: boolean };
};
export type SetupRecord = {
  answers: string[];
  dismissed: boolean;
  completed: boolean;
};
export const EMPTY_ANSWERS: SetupAnswers = {
  identity: { name: "", role: "" },
  priorities: [],
  family: "",
  cared: [],
  invited: [],
  calendar: { google: false },
};
export const EMPTY_SETUP: SetupRecord = {
  answers: [],
  dismissed: false,
  completed: false,
};
export const localSetupKey = (userId: string, householdId: string) =>
  `cola:home-setup-v3:${userId}:${householdId}`;
export const encodeStep = (step: number, value: SetupAnswers): string => {
  const fragments: unknown[] = [
    value.identity,
    value.priorities,
    value.family,
    value.cared,
    value.invited,
    value.calendar,
  ];
  return JSON.stringify({ version: 2, step, value: fragments[step] });
};
export function parseSetup(record: SetupRecord): SetupAnswers {
  const state: SetupAnswers = structuredClone(EMPTY_ANSWERS);
  const slots: (keyof SetupAnswers)[] = [
    "identity",
    "priorities",
    "family",
    "cared",
    "invited",
    "calendar",
  ];
  record.answers.slice(0, 6).forEach((raw, index) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("version" in parsed) ||
        !("value" in parsed) ||
        (parsed as { version?: number }).version !== 2
      )
        return;
      const candidate = (parsed as { value: unknown }).value;
      if (candidate !== null && candidate !== undefined)
        (state as unknown as Record<string, unknown>)[slots[index]] = candidate;
    } catch {
      /* legado: respostas antigas permanecem no banco, mas não viram dados estruturados */
    }
  });
  return state;
}
export function readLocalSetup(
  userId: string,
  householdId: string,
): SetupRecord {
  try {
    const value = JSON.parse(
      localStorage.getItem(localSetupKey(userId, householdId)) || "null",
    );
    return {
      answers: Array.isArray(value?.answers)
        ? value.answers
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 6)
        : [],
      dismissed: value?.dismissed === true,
      completed: value?.completed === true,
    };
  } catch {
    return structuredClone(EMPTY_SETUP);
  }
}
export async function readSetup(
  userId: string,
  householdId: string,
): Promise<SetupRecord> {
  const local = readLocalSetup(userId, householdId);
  try {
    const cache = JSON.parse(
      localStorage.getItem(localSetupKey(userId, householdId)) || "null",
    );
    if (cache?.pendingSync === true) return local;
  } catch {
    /* ignore */
  }
  const { data, error } = await supabase
    .from("cola_home_preferences")
    .select("answers,dismissed,completed")
    .eq("user_id", userId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return local;
  const remote: SetupRecord = {
    answers: Array.isArray(data.answers)
      ? data.answers.filter((x: unknown) => typeof x === "string").slice(0, 6)
      : [],
    completed: data.completed === true,
    dismissed: data.dismissed === true,
  };
  try {
    localStorage.setItem(
      localSetupKey(userId, householdId),
      JSON.stringify(remote),
    );
  } catch {
    /* ignore */
  }
  return remote;
}
export async function saveSetup(
  userId: string,
  householdId: string,
  record: SetupRecord,
): Promise<void> {
  // Dados locais preservados inclusive quando a rede falhar. A UI exige retry antes de avançar.
  try {
    localStorage.setItem(
      localSetupKey(userId, householdId),
      JSON.stringify({ ...record, pendingSync: true }),
    );
  } catch {
    /* storage indisponível */
  }
  const { error } = await supabase.from("cola_home_preferences").upsert(
    {
      user_id: userId,
      household_id: householdId,
      answers: record.answers.slice(0, 6),
      completed: record.completed,
      dismissed: record.dismissed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,household_id" },
  );
  if (error) throw error;
  try {
    localStorage.setItem(
      localSetupKey(userId, householdId),
      JSON.stringify(record),
    );
  } catch {
    /* ignore */
  }
}
export function updateAnswers(
  record: SetupRecord,
  step: number,
  value: SetupAnswers,
): SetupRecord {
  const answers = [...record.answers].slice(0, step);
  answers[step] = encodeStep(step, value);
  return { answers, completed: false, dismissed: false };
}
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
export function friendlyError(error: unknown): string {
  if (!navigator.onLine)
    return "Sem conexão com a internet. Suas respostas foram guardadas neste aparelho. Tente novamente quando a conexão voltar.";
  const value = error instanceof Error ? error.message : String(error);
  if (/already|duplicate|unique|23505/i.test(value))
    return "Este registro já existe. Confira os dados e tente novamente.";
  if (/permission|policy|rls|42501|not authorized|not allowed/i.test(value))
    return "Sem permissão para esta operação. Verifique seu acesso à casa.";
  return "Não deu pra salvar agora. Suas respostas foram preservadas. Tente novamente.";
}
export async function savePreferredName(name: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { preferred_name: name.trim() },
  });
  if (error) throw error;
}
export async function saveCareProfiles(
  householdId: string,
  userId: string,
  drafts: CareDraft[],
  onSaved: (items: CareDraft[]) => void,
): Promise<CareDraft[]> {
  const output = [...drafts];
  for (let i = 0; i < output.length; i++) {
    const row = output[i];
    if (row.createdId) continue;
    const { data, error } = await supabase
      .from("care_profiles")
      .insert({
        household_id: householdId,
        name: row.name.trim(),
        kind: row.kind,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    output[i] = { ...row, createdId: data.id };
    onSaved([...output]); // persiste ID no navegador imediatamente após cada insert
  }
  return output;
}
export async function getGoogleStatus(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("google-calendar", {
    body: { action: "status" },
  });
  if (error) throw error;
  return data?.status === "connected";
}
export async function startGoogleConnect(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("google-calendar", {
    body: { action: "auth-url" },
  });
  if (error) throw error;
  if (!data?.url || typeof data.url !== "string")
    throw new Error("URL do Google indisponível");
  const url = new URL(data.url);
  if (url.protocol !== "https:" || url.hostname !== "accounts.google.com")
    throw new Error("URL de autorização inválida");
  window.location.assign(url.toString());
}
export async function sendOnboardingInvite(
  householdId: string,
  draft: InviteDraft,
  careProfileId: string | null,
): Promise<{ status: "sent" | "link"; url: string }> {
  const { data, error } = await supabase.functions.invoke(
    "cola-onboarding-invite",
    {
      body: {
        householdId,
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        careProfileId,
      },
    },
  );
  if (error) throw error;
  if (!data || data.error)
    throw new Error(data?.error || "Não foi possível criar o convite");
  return {
    status: data.status === "sent" ? "sent" : "link",
    url: String(data.url || ""),
  };
}
