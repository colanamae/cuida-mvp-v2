export interface IncomingMessage {
  provider: 'twilio' | 'meta' | 'astracalls';
  externalId: string;
  from: string;
  to: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  receivedAt: string;
}
export interface OutboundRequest {
  to: string;
  text?: string;
  templateSid?: string;
  variables?: Record<string, string>;
}
export interface MessagingProvider {
  parseInbound(params: URLSearchParams): IncomingMessage | null;
  validateWebhook(raw: string, signature: string | null, url: string): Promise<boolean>;
  send(message: OutboundRequest): Promise<string>;
  downloadMedia(url: string, maxBytes: number): Promise<{ data: Uint8Array; type: string }>;
}
