import { createClient } from "npm:@supabase/supabase-js@2";

// Ao usar JWT do usuário, as RLS e a RPC create_invitation continuam aplicadas.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const APP_URL = (Deno.env.get("APP_PUBLIC_URL") || "https://cuida-mvp-v2.vercel.app").replace(/\/$/, "");
const ORIGINS = (Deno.env.get("APP_ALLOWED_ORIGINS") || `${APP_URL},http://localhost:5173`)
  .split(",").map((x) => x.trim());
function cors(origin: string | null) {
  return { "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
function response(req: Request, data: unknown, status = 200) {
  return Response.json(data, {status, headers: {...cors(req.headers.get("Origin")), "Cache-Control": "no-store"}});
}
function escapeHTML(value: string) { return value.replace(/[&<>"']/g, (s) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[s] || s); }
const validUUID = (v: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8a-f][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {status:204,headers:cors(req.headers.get("Origin"))});
  if (req.method !== "POST") return response(req, {error:"Método não permitido"}, 405);
  if (!ORIGINS.includes(req.headers.get("Origin") || "")) return response(req, {error:"Origem não autorizada"}, 403);
  const bearer = req.headers.get("Authorization") || "";
  if (!bearer.startsWith("Bearer ")) return response(req, {error:"Autenticação necessária"}, 401);
  try {
    const body = await req.json();
    const householdId = String(body.householdId || "");
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || "").trim().slice(0, 100);
    const careProfileId = body.careProfileId ? String(body.careProfileId) : null;
    if ((careProfileId && !validUUID(careProfileId)) || !validUUID(householdId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || name.length < 2)
      return response(req, {error:"Dados do convite inválidos"}, 400);
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: {headers: {Authorization: bearer}}, auth: {persistSession:false,autoRefreshToken:false},
    });
    const {data:{user},error:authError} = await client.auth.getUser(bearer.slice(7));
    if (authError || !user) return response(req,{error:"Sessão inválida"},401);
    if (email === user.email?.toLowerCase()) return response(req,{error:"Você já faz parte desta casa."},409);
    const {data:membership,error:memberError} = await client.from("household_members")
      .select("role").eq("household_id",householdId).eq("user_id",user.id).maybeSingle();
    if (memberError || membership?.role !== "admin") return response(req,{error:"Somente administradores podem convidar."},403);
    if (careProfileId) {
      const {data:care, error:careError} = await client.from("care_profiles")
        .select("id").eq("household_id",householdId).eq("id",careProfileId).maybeSingle();
      if (careError || !care) return response(req,{error:"Pessoa cuidada inválida."},400);
    }
    const {data:existing,error:exError} = await client.from("invitations")
      .select("id,token,expires_at,accepted_at,email")
      .eq("household_id",householdId).eq("email",email)
      .eq("scope",careProfileId ? "profile" : "household")
      .is("accepted_at",null).gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if (exError) throw exError;
    let token = existing?.token as string | undefined;
    let newlyCreated = false;
    if (!token) {
      const since = new Date(Date.now()-60*60*1000).toISOString();
      const {count,error:countError} = await client.from("invitations")
        .select("id",{count:"exact",head:true}).eq("household_id",householdId)
        .eq("created_by",user.id).gte("created_at",since);
      if (countError) throw countError;
      if ((count || 0) >= 10) return response(req,{error:"Limite de 10 convites por hora. Tente novamente depois."},429);
      const {data:created,error:createError} = await client.rpc("create_invitation",{
        p_household_id:householdId,p_email:email,p_scope:careProfileId ? "profile" : "household",p_profile_id:careProfileId,
      });
      if (createError) throw createError;
      token = String(created);
      newlyCreated = true;
    }
    if (!token) throw new Error("Convite não disponível");
    const url = `${APP_URL}/convite?convite=${encodeURIComponent(token)}`;
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const sender = Deno.env.get("RESEND_FROM_EMAIL");
    if (!apiKey || !sender) return response(req,{status:"link",url,newlyCreated});
    const safeName = escapeHTML(name);
    const html = `<p>Olá, ${safeName}!</p><p>Você recebeu um convite para compartilhar o cuidado familiar na Cola.</p><p><a href="${url}">Aceitar convite</a></p><p>Este convite expira em sete dias. Se não esperava esta mensagem, pode ignorá-la.</p>`;
    const mail = await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({from:sender,to:[email],subject:"Um convite para cuidar junto na Cola",html}),
    });
    if (!mail.ok) {
      console.error("Falha ao enviar convite",mail.status);
      // Registro existe. Devolve link válido para recuperação manual em vez de fingir sucesso.
      return response(req,{status:"link",url,newlyCreated,warning:"Convite criado, mas o envio de e-mail falhou."});
    }
    return response(req,{status:"sent",url,newlyCreated});
  } catch(e) {
    console.error("onboarding-invite",e instanceof Error ? e.message : "unknown");
    return response(req,{error:"Não foi possível criar o convite. Tente novamente."},500);
  }
});
