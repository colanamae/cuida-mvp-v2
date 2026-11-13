import { admin, authorizedJob, json } from "../_shared/messaging/db.ts";
import { getProvider } from "../_shared/messaging/twilio.ts";
import { accessToken, googleFetch } from "../_shared/google.ts";
const db = admin(),
  provider = getProvider();
const app = (
  Deno.env.get("APP_PUBLIC_URL") || "https://cuida-mvp-v2.vercel.app"
).replace(/\/$/, "");
const MINUTE = 60000;

async function enqueueTasks() {
  const now = Date.now();
  const { data: accounts, error: ae } = await db
    .from("messaging_accounts")
    .select("*")
    .is("opted_out_at", null);
  if (ae) throw ae;
  for (const account of accounts || []) {
    // Usuários com vínculo revogado não recebem avisos.
    const { data: member } = await db
      .from("household_members")
      .select("id,scope")
      .eq("household_id", account.household_id)
      .eq("user_id", account.user_id)
      .maybeSingle();
    if (!member || member.scope !== "household") continue;
    const { data: tasks, error } = await db
      .from("tasks")
      .select("id,title,due_at,assignees,status")
      .eq("household_id", account.household_id)
      .neq("status", "done")
      .gte("due_at", new Date(now).toISOString())
      .lte("due_at", new Date(now + 31 * MINUTE).toISOString())
      .limit(100);
    if (error) throw error;
    for (const task of tasks || []) {
      if (!(task.assignees || []).includes(account.user_id)) continue;
      const key = `task:30:${task.id}:${account.id}`;
      const due = new Date(task.due_at).toLocaleString("pt-BR", {
        timeZone: "America/Recife",
        dateStyle: "short",
        timeStyle: "short",
      });
      const variables = {
        "1": task.title.slice(0, 100).replace(/\n/g, " "),
        "2": due,
        "3": `${app}/tarefas?taskId=${encodeURIComponent(task.id)}`,
      };
      const { error: insert } = await db.from("messaging_outbox").upsert(
        {
          provider: "twilio",
          account_id: account.id,
          kind: "task_due",
          dedupe_key: key,
          text: `Cola: tarefa ${task.title} prevista para ${due}. Veja: ${variables["3"]}`,
          // O ContentSid aprovado é obrigatório para avisos fora da janela de 24h.
          template_sid: Deno.env.get("TWILIO_UTILITY_CONTENT_SID") || null,
          variables,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      );
      if (insert) throw insert;
    }
  }
}
async function enqueueCalendar() {
  const now = Date.now();
  const { data: accounts, error } = await db
    .from("messaging_accounts")
    .select("*")
    .is("opted_out_at", null);
  if (error) throw error;
  for (const account of accounts || []) {
    const { data: member } = await db
      .from("household_members")
      .select("scope")
      .eq("household_id", account.household_id)
      .eq("user_id", account.user_id)
      .maybeSingle();
    if (!member || member.scope !== "household") continue;
    try {
      const token = await accessToken(account.user_id);
      if (!token) continue;
      const query = new URLSearchParams({
        timeMin: new Date(now).toISOString(),
        timeMax: new Date(now + 31 * MINUTE).toISOString(),
        singleEvents: "true",
        maxResults: "100",
      });
      const response = await googleFetch(
        `/calendars/primary/events?${query}`,
        token,
      );
      for (const event of response.items || []) {
        if (!event.id || !event.start?.dateTime) continue;
        const start = Date.parse(event.start.dateTime);
        if (!Number.isFinite(start) || start < now || start > now + 31 * MINUTE)
          continue;
        const title = String(event.summary || "Compromisso")
          .slice(0, 100)
          .replace(/\n/g, " ");
        const when = new Date(start).toLocaleString("pt-BR", {
          timeZone: "America/Recife",
          dateStyle: "short",
          timeStyle: "short",
        });
        const uri = `${app}/agenda`;
        const { error: insert } = await db
          .from("messaging_outbox")
          .upsert(
            {
              provider: "twilio",
              account_id: account.id,
              kind: "calendar_due",
              dedupe_key: `calendar:30:${account.id}:${event.id}:${start}`,
              text: `Cola: compromisso ${title} às ${when}. Veja: ${uri}`,
              template_sid: Deno.env.get("TWILIO_UTILITY_CONTENT_SID") || null,
              variables: { "1": title, "2": when, "3": uri },
            },
            { onConflict: "dedupe_key", ignoreDuplicates: true },
          );
        if (insert) throw insert;
      }
    } catch (e) {
      console.error(
        "calendar reminders:",
        e instanceof Error ? e.message : "unknown",
      );
    }
  }
}
Deno.serve(async (req) => {
  if (req.method !== "POST" || !authorizedJob(req))
    return json({ error: "Não autorizado" }, 401);
  try {
    await enqueueTasks();
    await enqueueCalendar();
    const { data, error } = await db.rpc("claim_messaging_outbox", {
      p_limit: 10,
    });
    if (error) throw error;
    let sent = 0,
      failed = 0,
      skipped = 0;
    for (const row of data || []) {
      try {
        const { data: account, error: ae } = await db
          .from("messaging_accounts")
          .select("*")
          .eq("id", row.account_id)
          .maybeSingle();
        if (ae) throw ae;
        if (!account || account.opted_out_at) {
          await db
            .from("messaging_outbox")
            .update({ status: "cancelled" })
            .eq("id", row.id);
          skipped++;
          continue;
        }
        const { data: member } = await db
          .from("household_members")
          .select("scope")
          .eq("household_id", account.household_id)
          .eq("user_id", account.user_id)
          .maybeSingle();
        if (!member || member.scope !== "household") {
          await db
            .from("messaging_outbox")
            .update({ status: "cancelled" })
            .eq("id", row.id);
          skipped++;
          continue;
        }
        const inSession =
          account.last_inbound_at &&
          Date.now() - new Date(account.last_inbound_at).getTime() <
            23 * 60 * 60 * 1000;
        const template =
          row.kind === "reply"
            ? null
            : row.template_sid || Deno.env.get("TWILIO_UTILITY_CONTENT_SID");
        if (!inSession && !template) {
          await db
            .from("messaging_outbox")
            .update({
              status: "failed",
              last_error:
                "Template aprovado obrigatório fora da janela de atendimento",
            })
            .eq("id", row.id);
          failed++;
          continue;
        }
        const sid = await provider.send(
          !inSession && template
            ? {
                to: account.phone,
                templateSid: template,
                variables: row.variables || { "1": row.text.slice(0, 150) },
              }
            : { to: account.phone, text: row.text },
        );
        await db
          .from("messaging_outbox")
          .update({ status: "sent", external_sid: sid, last_error: null })
          .eq("id", row.id);
        sent++;
      } catch (e) {
        const reason = e instanceof Error ? e.message : "unknown";
        console.error("dispatch:", reason);
        await db
          .from("messaging_outbox")
          .update({
            status: row.attempts >= 3 ? "failed" : "pending",
            available_at: new Date(
              Date.now() + Math.min(60, row.attempts * 5) * MINUTE,
            ).toISOString(),
            last_error: reason.slice(0, 300),
          })
          .eq("id", row.id);
        failed++;
      }
    }
    return json({ sent, failed, skipped });
  } catch (e) {
    console.error("dispatch error:", e instanceof Error ? e.message : e);
    return json({ error: "Falha ao enviar notificações" }, 500);
  }
});
