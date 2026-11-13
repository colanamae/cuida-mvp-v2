import { createClient } from "npm:@supabase/supabase-js@2";
export function admin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuração Supabase ausente");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function authorizedJob(req: Request): boolean {
  const secret = Deno.env.get("MESSAGING_WORKER_SECRET");
  return Boolean(
    secret && req.headers.get("Authorization") === `Bearer ${secret}`,
  );
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
