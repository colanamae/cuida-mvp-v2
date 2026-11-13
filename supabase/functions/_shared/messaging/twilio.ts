import type {
  MessagingProvider,
  IncomingMessage,
  OutboundRequest,
} from "./provider.ts";

/* ==========================================
   VARIÁVEIS DE AMBIENTE
   ========================================== */

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Secret não configurado: ${name}`);
  }

  return value;
}

function basic(): string {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");

  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

/* ==========================================
   FORMATAÇÃO DOS NÚMEROS
   ========================================== */

function whatsapp(value: string): string {
  if (!/^\+\d{8,15}$/.test(value)) {
    throw new Error("Número E.164 inválido");
  }

  return `whatsapp:${value}`;
}

function decodeWhatsApp(value: string): string | null {
  const match = /^whatsapp:(\+\d{8,15})$/.exec(value);
  return match?.[1] || null;
}

/* ==========================================
   CONFIGURAÇÃO DO REMETENTE
   ========================================== */

function configureSender(params: URLSearchParams): void {
  const messagingServiceSid = Deno.env
    .get("TWILIO_MESSAGING_SERVICE_SID")
    ?.trim();

  const whatsappFrom = Deno.env.get("TWILIO_WHATSAPP_FROM")?.trim();

  // Prioridade: Messaging Service.
  if (messagingServiceSid) {
    if (!/^MG[a-f0-9]{32}$/i.test(messagingServiceSid)) {
      throw new Error("TWILIO_MESSAGING_SERVICE_SID inválido");
    }

    params.set("MessagingServiceSid", messagingServiceSid);

    return;
  }

  // Alternativa: número WhatsApp direto.
  if (whatsappFrom) {
    const normalized = whatsappFrom.startsWith("whatsapp:")
      ? whatsappFrom.slice("whatsapp:".length)
      : whatsappFrom;

    params.set("From", whatsapp(normalized));
    return;
  }

  throw new Error(
    "Configure TWILIO_MESSAGING_SERVICE_SID ou TWILIO_WHATSAPP_FROM",
  );
}

/* ==========================================
   ADAPTADOR TWILIO
   ========================================== */

export class TwilioAdapter implements MessagingProvider {
  /* ----------------------------------------
     RECEBER MENSAGENS
     ---------------------------------------- */

  parseInbound(params: URLSearchParams): IncomingMessage | null {
    const from = decodeWhatsApp(params.get("From") || "");

    const to = decodeWhatsApp(params.get("To") || "");

    const externalId = params.get("MessageSid") || "";

    if (!from || !to || !/^SM[a-f0-9]{32}$/i.test(externalId)) {
      return null;
    }

    const mediaUrl = params.get("MediaUrl0") || undefined;

    const mediaType = params.get("MediaContentType0") || undefined;

    return {
      provider: "twilio",
      externalId,
      from,
      to,
      text: (params.get("Body") || "").slice(0, 4000),
      mediaUrl,
      mediaType,
      receivedAt: new Date().toISOString(),
    };
  }

  /* ----------------------------------------
     VALIDAR ASSINATURA DO WEBHOOK
     ---------------------------------------- */

  async validateWebhook(
    raw: string,
    signature: string | null,
    url: string,
  ): Promise<boolean> {
    if (!signature) return false;

    // Twilio:
    // Base64(HMAC-SHA1(authToken, URL + parâmetros)).
    const params = new URLSearchParams(raw);

    const keys = [...new Set(params.keys())].sort();

    let data = url;

    for (const key of keys) {
      for (const value of params.getAll(key)) {
        data += key + value;
      }
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env("TWILIO_AUTH_TOKEN")),
      {
        name: "HMAC",
        hash: "SHA-1",
      },
      false,
      ["sign"],
    );

    const signed = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)),
    );

    const expected = btoa(String.fromCharCode(...signed));

    // Comparação sem saída antecipada.
    const a = new TextEncoder().encode(expected);
    const b = new TextEncoder().encode(signature);

    if (a.length !== b.length) {
      return false;
    }

    let diff = 0;

    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }

    return diff === 0;
  }

  /* ----------------------------------------
     ENVIAR MENSAGEM
     ---------------------------------------- */

  async send(message: OutboundRequest): Promise<string> {
    const params = new URLSearchParams();

    // Destinatário WhatsApp.
    params.set("To", whatsapp(message.to));

    // Usa MessagingServiceSid, com fallback para From.
    configureSender(params);

    // Template aprovado pela Meta.
    if (message.templateSid) {
      params.set("ContentSid", message.templateSid);

      if (message.variables) {
        params.set("ContentVariables", JSON.stringify(message.variables));
      }
    } else if (message.text) {
      // Mensagem livre durante janela de atendimento.
      params.set("Body", message.text.slice(0, 1500));
    } else {
      throw new Error("Texto ou template obrigatório");
    }

    // Callback opcional para status de entrega.
    const callback = Deno.env.get("TWILIO_STATUS_CALLBACK_URL")?.trim();

    if (callback) {
      params.set("StatusCallback", callback);
    }

    const accountSid = env("TWILIO_ACCOUNT_SID");

    const url =
      `https://api.twilio.com/2010-04-01/` +
      `Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basic(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.sid) {
      const code = data.code || "unknown";

      const detail =
        typeof data.message === "string"
          ? data.message.slice(0, 250)
          : "Falha não especificada";

      throw new Error(`Twilio HTTP ${response.status}: ${code} - ${detail}`);
    }

    return data.sid as string;
  }

  /* ----------------------------------------
     DOWNLOAD DE MÍDIA
     ---------------------------------------- */

  async downloadMedia(
    url: string,
    maxBytes: number,
  ): Promise<{
    data: Uint8Array;
    type: string;
  }> {
    const parsed = new URL(url);

    const domain = parsed.hostname.toLowerCase();

    if (
      parsed.protocol !== "https:" ||
      !(
        domain === "api.twilio.com" ||
        domain.endsWith(".twilio.com") ||
        domain.endsWith(".twiliocdn.com")
      )
    ) {
      throw new Error("Origem do anexo não permitida");
    }

    const response = await fetch(url, {
      headers: {
        Authorization: basic(),
      },
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar mídia: ${response.status}`);
    }

    if (Number(response.headers.get("content-length") || "0") > maxBytes) {
      throw new Error("Mídia muito grande");
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (!bytes.length || bytes.length > maxBytes) {
      throw new Error("Mídia inválida ou grande demais");
    }

    return {
      data: bytes,
      type: (
        response.headers.get("content-type") || "application/octet-stream"
      ).split(";")[0],
    };
  }
}

/* ==========================================
   SELEÇÃO DO PROVEDOR
   ========================================== */

export function getProvider(): MessagingProvider {
  const selected = Deno.env.get("MESSAGING_PROVIDER") || "twilio";

  if (selected === "twilio") {
    return new TwilioAdapter();
  }

  throw new Error(`Provedor ainda não implementado: ${selected}`);
}
