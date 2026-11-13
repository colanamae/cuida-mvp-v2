import {
  admin,
  accessToken,
  digest,
  GOOGLE_SCOPE,
  googleFetch,
  required,
  respond as sharedRespond,
  safeError,
} from "../_shared/google.ts";

/* ==========================================
   CONFIGURAÇÃO DE CORS
   ========================================== */

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://cuida-mvp-v2.vercel.app",
]);

function getCorsHeaders(req: Request): Headers {
  const origin = req.headers.get("Origin");

  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

/* ==========================================
   VALIDAÇÕES
   ========================================== */

const validMail = (input: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/* ==========================================
   EDGE FUNCTION
   ========================================== */

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  /*
   * Utiliza a função respond existente, mas sobrescreve
   * os cabeçalhos CORS conforme a origem da requisição.
   * Assim, todas as respostas recebem o CORS correto.
   */
  function respond(payload: unknown, status = 200): Response {
    const original = sharedRespond(payload, status);

    const headers = new Headers(original.headers);

    for (const [key, value] of corsHeaders.entries()) {
      headers.set(key, value);
    }

    // Remover origem fixa eventualmente definida no helper.
    if (!corsHeaders.has("Access-Control-Allow-Origin")) {
      headers.delete("Access-Control-Allow-Origin");
    }

    return new Response(original.body, {
      status: original.status,
      headers,
    });
  }

  /* ----------------------------------------
     PREFLIGHT / OPTIONS
     ---------------------------------------- */

  const origin = req.headers.get("Origin");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return respond({ error: "Origem não autorizada." }, 403);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return respond({ error: "Método não permitido" }, 405);
  }

  /* ----------------------------------------
     AUTENTICAÇÃO
     ---------------------------------------- */

  const header = req.headers.get("Authorization");

  if (!header?.startsWith("Bearer ")) {
    return respond({ error: "Entre na sua conta para continuar." }, 401);
  }

  try {
    const db = admin();

    // Sempre validar o JWT do usuário no servidor.
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(header.slice(7));

    if (authError || !user) {
      return respond({ error: "Sessão inválida." }, 401);
    }

    const input = await req.json();
    const action = input.action as string;

    /* ----------------------------------------
       STATUS DA CONEXÃO GOOGLE
       ---------------------------------------- */

    if (action === "status") {
      const { data, error } = await db
        .from("google_calendar_connections")
        .select("google_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      return respond({
        status: data ? "connected" : "disconnected",
        email: data?.google_email || null,
      });
    }

    /* ----------------------------------------
       GERAR URL DE AUTORIZAÇÃO GOOGLE
       ---------------------------------------- */

    if (action === "auth-url") {
      const state = crypto.randomUUID() + crypto.randomUUID();

      const { error } = await db.from("google_calendar_oauth_states").insert({
        state_hash: await digest(state),
        user_id: user.id,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");

      auth.searchParams.set("client_id", required("GOOGLE_CLIENT_ID"));

      auth.searchParams.set("redirect_uri", required("GOOGLE_REDIRECT_URI"));

      auth.searchParams.set("response_type", "code");

      auth.searchParams.set("access_type", "offline");

      auth.searchParams.set("prompt", "consent");

      auth.searchParams.set("scope", GOOGLE_SCOPE);

      auth.searchParams.set("state", state);

      return respond({
        url: auth.toString(),
      });
    }

    /* ----------------------------------------
       DESCONECTAR GOOGLE CALENDAR
       ---------------------------------------- */

    if (action === "disconnect") {
      const { error } = await db
        .from("google_calendar_connections")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      return respond({
        status: "disconnected",
      });
    }

    /* ----------------------------------------
       OBTER TOKEN GOOGLE
       ---------------------------------------- */

    const token = await accessToken(user.id);

    if (!token) {
      return respond(
        {
          status: "disconnected",
          events: [],
          error: "Conecte o Google Agenda primeiro.",
        },
        409,
      );
    }

    /* ----------------------------------------
       LISTAR COMPROMISSOS
       ---------------------------------------- */

    if (action === "list") {
      if (
        !validDate(input.timeMin) ||
        !validDate(input.timeMax) ||
        new Date(input.timeMax).getTime() <=
          new Date(input.timeMin).getTime() ||
        new Date(input.timeMax).getTime() - new Date(input.timeMin).getTime() >
          120 * 86400000
      ) {
        return respond({ error: "Período inválido." }, 400);
      }

      const params = new URLSearchParams({
        timeMin: new Date(input.timeMin).toISOString(),
        timeMax: new Date(input.timeMax).toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });

      const events = [];
      let pageToken = "";

      // Limita a paginação a quatro chamadas.
      for (let page = 0; page < 4; page++) {
        if (pageToken) {
          params.set("pageToken", pageToken);
        }

        const data = await googleFetch(
          `/calendars/primary/events?${params}`,
          token,
        );

        for (const e of data.items || []) {
          if (!e.start?.dateTime && !e.start?.date) {
            continue;
          }

          events.push({
            id: e.id,
            calendarId: "primary",
            title: e.summary || "Sem título",
            startsAt: e.start.dateTime || e.start.date,
            endsAt: e.end?.dateTime || e.end?.date || null,
            allDay: !!e.start.date,
            location: e.location || "",
            organizer: e.organizer?.email || "",
            htmlLink: e.htmlLink || "",
            attendees: Array.isArray(e.attendees)
              ? e.attendees
                  .map((p: { email?: string }) => p.email)
                  .filter(Boolean)
              : [],
          });
        }

        pageToken = data.nextPageToken || "";

        if (!pageToken) break;
      }

      return respond({
        status: "connected",
        events,
      });
    }

    /* ----------------------------------------
       CRIAR COMPROMISSO
       ---------------------------------------- */

    if (action === "create") {
      const e = input.event || {};

      const title = typeof e.title === "string" ? e.title.trim() : "";

      if (!title || title.length > 160) {
        return respond(
          {
            error: "Informe o nome do compromisso (até 160 caracteres).",
          },
          400,
        );
      }

      if (
        !validDate(e.startsAt) ||
        !validDate(e.endsAt) ||
        new Date(e.endsAt).getTime() <= new Date(e.startsAt).getTime()
      ) {
        return respond(
          {
            error:
              "Confira a data e os horários. O fim deve ser depois do início.",
          },
          400,
        );
      }

      if (
        new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime() >
        7 * 86400000
      ) {
        return respond(
          {
            error: "O compromisso não pode durar mais de sete dias.",
          },
          400,
        );
      }

      const location =
        typeof e.location === "string" ? e.location.trim().slice(0, 500) : "";

      const description =
        typeof e.description === "string"
          ? e.description.trim().slice(0, 2000)
          : "";

      const responsibleEmail =
        typeof e.responsibleEmail === "string"
          ? e.responsibleEmail.trim().toLowerCase()
          : "";

      if (responsibleEmail && !validMail(responsibleEmail)) {
        return respond(
          {
            error: "Confira o e-mail da pessoa responsável.",
          },
          400,
        );
      }

      const reminderMinutes =
        e.reminderMinutes === null
          ? null
          : e.reminderMinutes === undefined
            ? 30
            : e.reminderMinutes;

      if (
        reminderMinutes !== null &&
        (!Number.isInteger(reminderMinutes) ||
          reminderMinutes < 0 ||
          reminderMinutes > 40320)
      ) {
        return respond(
          {
            error: "Escolha um lembrete válido (até 28 dias antes).",
          },
          400,
        );
      }

      const reminders =
        reminderMinutes === null
          ? {
              useDefault: false,
              overrides: [],
            }
          : {
              useDefault: false,
              overrides: [
                {
                  method: "popup",
                  minutes: reminderMinutes,
                },
              ],
            };

      const body = {
        summary: title,
        start: {
          dateTime: new Date(e.startsAt).toISOString(),
        },
        end: {
          dateTime: new Date(e.endsAt).toISOString(),
        },
        ...(location ? { location } : {}),
        ...(description ? { description } : {}),
        ...(responsibleEmail
          ? {
              attendees: [{ email: responsibleEmail }],
            }
          : {}),
        reminders,
      };

      const created = await googleFetch(
        "/calendars/primary/events?sendUpdates=all",
        token,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      return respond(
        {
          status: "created",
          id: created.id,
          htmlLink: created.htmlLink,
        },
        201,
      );
    }

    /* ----------------------------------------
       AÇÃO DESCONHECIDA
       ---------------------------------------- */

    return respond({ error: "Ação inválida." }, 400);
  } catch (error) {
    return respond({ error: safeError(error) }, 500);
  }
});
