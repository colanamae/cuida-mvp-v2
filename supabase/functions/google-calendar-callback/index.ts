import {
  admin,
  digest,
  encrypt,
  required,
  tokenExchange,
} from "../_shared/google.ts";

type CallbackResult = "connected" | "error";

function redirect(result: CallbackResult): Response {
  const appOrigin = required("APP_ORIGIN");
  const url = new URL("/agenda", appOrigin);

  url.searchParams.set("google", result);

  return Response.redirect(url.toString(), 303);
}

function logError(step: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "Erro desconhecido";

  console.error(`[google-calendar-callback] ${step}: ${message}`);
}

function redirectError(): Response {
  try {
    return redirect("error");
  } catch (error) {
    logError("Falha ao redirecionar", error);

    return new Response("Erro na configuração do callback Google.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // ==========================================
  // VALIDAR MÉTODO
  // ==========================================

  if (req.method !== "GET") {
    return new Response("Método não permitido", {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  const url = new URL(req.url);

  // ==========================================
  // VERIFICAR ERRO RETORNADO PELO GOOGLE
  // ==========================================

  if (url.searchParams.has("error")) {
    console.warn("[google-calendar-callback] Google retornou erro OAuth");

    return redirectError();
  }

  // ==========================================
  // VALIDAR CODE E STATE
  // ==========================================

  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  if (!state || !code || state.length > 150 || code.length > 4096) {
    console.warn("[google-calendar-callback] Código ou state ausente/inválido");

    return redirectError();
  }

  try {
    // ========================================
    // INICIALIZAR SUPABASE
    // ========================================

    const db = admin();

    // ========================================
    // CONSUMIR STATE OAUTH
    // ========================================

    const stateHash = await digest(state);

    const { data: userId, error: stateError } = await db.rpc(
      "consume_google_calendar_oauth_state",
      {
        p_hash: stateHash,
      },
    );

    if (stateError) {
      throw new Error(`Falha ao consumir estado OAuth: ${stateError.message}`);
    }

    if (!userId) {
      console.warn(
        "[google-calendar-callback] State expirado, inválido ou já utilizado",
      );

      return redirectError();
    }

    console.info("[google-calendar-callback] Estado OAuth validado");

    // ========================================
    // TROCAR CODE POR TOKENS GOOGLE
    // ========================================

    const tokens = await tokenExchange({
      code,
      grant_type: "authorization_code",
      redirect_uri: required("GOOGLE_REDIRECT_URI"),
    });

    if (!tokens.access_token) {
      throw new Error("Google não forneceu access token");
    }

    if (!tokens.refresh_token) {
      throw new Error("Google não forneceu refresh token");
    }

    if (!Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) {
      throw new Error("Tempo de expiração do token inválido");
    }

    console.info("[google-calendar-callback] Tokens OAuth recebidos");

    // ========================================
    // CRIPTOGRAFAR TOKENS
    // ========================================

    const encryptedRefreshToken = await encrypt(tokens.refresh_token);

    const encryptedAccessToken = await encrypt(tokens.access_token);

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    // ========================================
    // SALVAR CONEXÃO NO SUPABASE
    // ========================================

    const { error: connectionError } = await db
      .from("google_calendar_connections")
      .upsert(
        {
          user_id: userId,
          token_ciphertext: encryptedRefreshToken,
          access_token_ciphertext: encryptedAccessToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

    if (connectionError) {
      throw new Error(`Falha ao salvar conexão: ${connectionError.message}`);
    }

    console.info("[google-calendar-callback] Conexão salva com sucesso");

    // ========================================
    // REDIRECIONAR PARA AGENDA
    // ========================================

    return redirect("connected");
  } catch (error) {
    logError("Falha no fluxo OAuth", error);

    return redirectError();
  }
});
