import { supabase } from "./supabase";
export async function createWhatsAppLink(
  householdId: string,
): Promise<{ code: string; expires_in_seconds: number }> {
  const { data, error } = await supabase.functions.invoke("whatsapp-link", {
    body: { household_id: householdId },
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function unlinkWhatsApp(householdId: string) {
  const { error } = await supabase.rpc("unlink_whatsapp", {
    p_household_id: householdId,
  });
  if (error) throw error;
}
export async function linkedWhatsApp(
  householdId: string,
): Promise<{ phone: string } | null> {
  const { data, error } = await supabase
    .from("messaging_accounts")
    .select("phone")
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
