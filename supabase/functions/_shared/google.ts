import { createClient } from 'npm:@supabase/supabase-js@2';
export const API = 'https://www.googleapis.com/calendar/v3';
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
export const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
export function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}
export function admin() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function digest(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map(n => n.toString(16).padStart(2,'0')).join('');
}
function b64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
}
function unb64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
async function cryptKey(): Promise<CryptoKey> {
  const key = unb64(required('GOOGLE_TOKEN_ENCRYPTION_KEY'));
  if (key.length !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY deve ter 32 bytes em base64');
  return crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function encrypt(value: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const result = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},await cryptKey(),encoded));
  return `v1.${b64(nonce)}.${b64(result)}`;
}
export async function decrypt(value: string): Promise<string> {
  const [version,iv,encrypted] = value.split('.');
  if(version !== 'v1' || !iv || !encrypted) throw new Error('Token inválido');
  const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await cryptKey(),unb64(encrypted));
  return new TextDecoder().decode(plain);
}
export async function tokenExchange(parameters: Record<string,string>) {
  const response = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id:required('GOOGLE_CLIENT_ID'),client_secret:required('GOOGLE_CLIENT_SECRET'),...parameters})
  });
  const body = await response.json();
  if (!response.ok) throw new Error('Não foi possível concluir a autorização com o Google');
  return body as {access_token:string,refresh_token?:string,expires_in:number,scope?:string};
}
export async function accessToken(userId: string): Promise<string|null> {
  const db=admin();
  const {data,error}=await db.from('google_calendar_connections').select('*').eq('user_id',userId).maybeSingle();
  if(error) throw error;
  if(!data) return null;
  if(data.access_token_ciphertext && data.expires_at && new Date(data.expires_at).getTime() > Date.now()+90000)
    return decrypt(data.access_token_ciphertext);
  try {
    const credentials=await tokenExchange({grant_type:'refresh_token',refresh_token:await decrypt(data.token_ciphertext)});
    const {error:updateError}=await db.from('google_calendar_connections').update({
      access_token_ciphertext:await encrypt(credentials.access_token),
      expires_at:new Date(Date.now()+credentials.expires_in*1000).toISOString(),updated_at:new Date().toISOString()
    }).eq('user_id',userId);
    if(updateError) throw updateError;
    return credentials.access_token;
  } catch(error) {
    // A revoked refresh token should never be treated as a silently successful connection.
    throw new Error('Conexão com Google Agenda expirada. Desconecte e conecte novamente.');
  }
}
export async function googleFetch(path:string,token:string,options:RequestInit={}) {
  const response=await fetch(`${API}${path}`,{
    ...options,
    headers:{Authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(response.status===401?'A autorização do Google expirou. Reconecte sua agenda.':
    response.status===403?'O Google não autorizou esta operação. Confira as permissões.':
    `Não foi possível comunicar com o Google Agenda (HTTP ${response.status}).`);
  return body;
}
export function safeError(error:unknown) {
  const message=error instanceof Error?error.message:'Erro inesperado';
  return message.startsWith('Variável de ambiente')?'Integração Google ainda não configurada.':message;
}
