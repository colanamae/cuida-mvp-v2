import {admin,digest,encrypt,required,tokenExchange} from '../_shared/google.ts';
const redirect=(result:'connected'|'error')=>{
  const url=new URL('/agenda',required('APP_ORIGIN'));
  url.searchParams.set('google',result);
  return Response.redirect(url.toString(),303);
};
Deno.serve(async req=>{
  const url=new URL(req.url);
  if(req.method!=='GET') return new Response('Método não permitido',{status:405});
  if(url.searchParams.has('error'))return redirect('error');
  const state=url.searchParams.get('state');
  const code=url.searchParams.get('code');
  if(!state||!code||state.length>150||code.length>4096)return redirect('error');
  try {
    const db=admin();
    const {data:userId,error:stateError}=await db.rpc('consume_google_calendar_oauth_state',{p_hash:await digest(state)});
    if(stateError||!userId)return redirect('error');
    const tokens=await tokenExchange({code,grant_type:'authorization_code',redirect_uri:required('GOOGLE_REDIRECT_URI')});
    if(!tokens.refresh_token)throw new Error('Google não forneceu token de atualização');
    // Do not request userinfo scopes: no unnecessary access to profile data.
    const {error}=await db.from('google_calendar_connections').upsert({
      user_id:userId,token_ciphertext:await encrypt(tokens.refresh_token),
      access_token_ciphertext:await encrypt(tokens.access_token),
      expires_at:new Date(Date.now()+tokens.expires_in*1000).toISOString(),
      updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(error) throw error;
    return redirect('connected');
  } catch {return redirect('error');}
});
