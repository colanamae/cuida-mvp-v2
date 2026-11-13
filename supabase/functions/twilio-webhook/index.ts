import { admin, json } from '../_shared/messaging/db.ts';
import { getProvider } from '../_shared/messaging/twilio.ts';
const xml = () => new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
  status: 200, headers: { 'content-type': 'text/xml; charset=utf-8' },
});
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  try {
    const provider = getProvider();
    const body = await req.text();
    // Configure TWILIO_WEBHOOK_URL exatamente como no painel Twilio (incluindo query string).
    const url = Deno.env.get('TWILIO_WEBHOOK_URL');
    if (!url || !await provider.validateWebhook(body, req.headers.get('X-Twilio-Signature'), url))
      return json({ error: 'Assinatura inválida' }, 403);
    const params = new URLSearchParams(body);
    const db = admin();
    const status = params.get('MessageStatus');
    if (status && ['queued','accepted','sending','sent','delivered','read','undelivered','failed'].includes(status) && params.get('MessageSid')) {
      await db.from('messaging_outbox').update({ provider_status: status }).eq('external_sid', params.get('MessageSid'));
      return xml();
    }
    const message = provider.parseInbound(params);
    if (!message) return xml();
    const { error } = await db.from('messaging_inbox').upsert({
      provider: 'twilio', external_id: message.externalId, sender_phone: message.from,
      recipient_phone: message.to, text: message.text, media_url: message.mediaUrl || null,
      media_type: message.mediaType || null,
    }, { onConflict: 'provider,external_id', ignoreDuplicates: true });
    if (error) { console.error('webhook insert:', error.code); return json({ error: 'Erro na fila' }, 500); }
    return xml();
  } catch (e) { console.error('webhook:', e instanceof Error ? e.message : e); return json({ error: 'Falha' }, 500); }
});
