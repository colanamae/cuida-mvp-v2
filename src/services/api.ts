import { supabase } from "./supabase";
import type {
  CareProfile,
  Checkin,
  ChatMessage,
  Dream,
  Event,
  Household,
  Invitation,
  Meal,
  Member,
  Shopping,
  Task,
  Transaction,
} from "../types/models";

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function list<T>(table: string, householdId: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as T[];
}

export const api = {
  async households(): Promise<Household[]> {
    const { data, error } = await supabase
      .from("households")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Household[];
  },

  async createHousehold(name: string) {
    const { data, error } = await supabase.rpc("create_household", {
      p_name: name,
    });
    if (error) throw error;
    return data as string;
  },

  members: (id: string) => list<Member>("household_members", id),
  profiles: (id: string) => list<CareProfile>("care_profiles", id),
  tasks: (id: string) => list<Task>("tasks", id),
  events: (id: string) => list<Event>("family_events", id),
  meals: (id: string) => list<Meal>("meals", id),
  shopping: (id: string) => list<Shopping>("shopping_items", id),
  dreams: (id: string) => list<Dream>("dreams", id),
  transactions: (id: string) => list<Transaction>("transactions", id),

  async checkins(id: string, userId: string) {
    const { data, error } = await supabase
      .from("wellbeing_checkins")
      .select("*")
      .eq("household_id", id)
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(30);

    if (error) throw error;
    return data as Checkin[];
  },

  async chat(id: string, userId: string) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("household_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    return data as ChatMessage[];
  },

  async sendToCuida(householdId: string, message: string) {
    const { data, error } = await supabase.functions.invoke("cuida", {
      body: {
        household_id: householdId,
        message,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.reply) throw new Error("A Cuida não retornou uma resposta.");

    return data.reply as string;
  },

  async invitations(id: string) {
    return list<Invitation>("invitations", id);
  },

  async save<T>(
    table: string,
    values: Record<string, unknown>,
    id?: string,
  ): Promise<T> {
    const result = id
      ? await supabase.from(table).update(values).eq("id", id).select().single()
      : await supabase.from(table).insert(values).select().single();

    if (result.error) throw result.error;
    return result.data as T;
  },

  async remove(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },

  async invite(payload: {
    household_id: string;
    email: string;
    scope: "household" | "profile";
    care_profile_id: string | null;
  }) {
    const { data, error } = await supabase.rpc("create_invitation", {
      p_household_id: payload.household_id,
      p_email: payload.email,
      p_scope: payload.scope,
      p_profile_id: payload.care_profile_id,
    });

    if (error) throw error;
    return data as string;
  },

  async acceptInvite(token: string) {
    const { data, error } = await supabase.rpc("accept_invitation", {
      p_token: token,
    });
    if (error) throw error;
    return data as string;
  },
};
