# Google Agenda — integração dentro da Cola (V3.4)

## O que está implementado

O módulo `Compromissos` oferece visualizações **dia, semana e mês**, filtros pelos participantes que aparecem nos eventos da conta conectada, conexão e desconexão Google, formulário interno de criação de evento com título, início/fim, local, descrição e convidados, feedback de erros e confirmação de gravação. No celular, o botão `+` é circular e flutuante; no desktop aparece como `+ Novo compromisso`.

Os dados são buscados **diretamente da conta Google autorizada**, via função `google-calendar`. Não há simulação nem dados de `family_events` nesse módulo. A integração **não cria automaticamente uma agenda compartilhada entre familiares**: cada pessoa conecta sua própria conta, e um evento é compartilhado apenas com convidados explicitamente informados (que podem receber e-mail do Google). Não é permitido ler agendas de terceiros sem a autorização do titular. Filtros de participantes mostram somente e-mails presentes nos eventos visíveis da conta conectada.

## Arquitetura e segurança

- `src/services/googleCalendar.ts`: interface do frontend para operações autenticadas.
- `src/components/NewCommitmentModal.tsx`: modal de criação dentro da Cola.
- `supabase/functions/google-calendar/index.ts`: função autenticada (`status`, `auth-url`, `list`, `create`, `disconnect`). As chamadas com JWT são verificadas com `auth.getUser` no servidor.
- `supabase/functions/google-calendar-callback/index.ts`: retorno OAuth sem JWT de navegador, protegido por `state` aleatório de uso único, hash SHA-256, validade de 10 minutos, consumido atomicamente no banco.
- `supabase/functions/_shared/google.ts`: cliente Google, rotação de access tokens e criptografia AES-256-GCM dos tokens persistidos.
- `supabase/migrations/202611060001_google_calendar.sql`: tabelas privadas de conexão e estado OAuth. Apenas o `service_role` pode acessá-las; **RLS está ativada sem políticas para usuários**.

A função solicita somente o escopo `https://www.googleapis.com/auth/calendar.events`, necessário para consultar e gravar eventos nas agendas autorizadas. Todas as credenciais confidenciais ficam nas Secrets das funções, nunca no React.

## Pré-requisitos

1. Projeto Supabase já configurado com Auth, migração inicial e a migração V3.4 aplicada.
2. Projeto Google Cloud com **Google Calendar API habilitada**.
3. Tela de consentimento OAuth configurada. Durante testes, adicione os e-mails autorizados como usuários de teste; para uso público, cumpra a verificação exigida pelo Google conforme os escopos e o tipo de publicação.
4. Credencial **OAuth Client ID → Aplicativo da Web** no Google Cloud.
5. URI de redirecionamento Google **idêntica** à função publicada, por exemplo:
   `https://SEU_PROJECT_REF.supabase.co/functions/v1/google-calendar-callback`.
6. Domínio seguro do frontend em produção (HTTPS).

## Implantação

Execute a partir da raiz do projeto, com Supabase CLI autenticada:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy google-calendar
supabase functions deploy google-calendar-callback --no-verify-jwt
```

Defina as **Secrets do projeto Supabase** (e não variáveis VITE_* do navegador). Gere uma chave AES única de 32 bytes:

```bash
openssl rand -base64 32
```

Configure no dashboard **Edge Functions → Secrets** as variáveis:

| Nome | Valor |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID da credencial OAuth Web |
| `GOOGLE_CLIENT_SECRET` | Client secret OAuth Web |
| `GOOGLE_REDIRECT_URI` | URL absoluta da `google-calendar-callback` publicada |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Resultado de `openssl rand -base64 32` |
| `APP_ORIGIN` | Origem do frontend, por exemplo `https://app.seudominio.com` (sem caminho ou barra final) |

O Supabase provê automaticamente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nos projetos que usam as chaves legadas; confirme a disponibilidade da service role no seu ambiente. **Nunca** publique essas chaves nem o segredo OAuth no frontend. Para desenvolvimento local com funções, acrescente as mesmas Secrets num arquivo `supabase/functions/.env` ignorado pelo Git.

Ao usar CORS, `APP_ORIGIN` deve corresponder exatamente à origem do frontend (em desenvolvimento: `http://localhost:5173`). Ajuste as URLs do OAuth do Google para o ambiente usado.

Após aplicar as migrações e publicar funções, faça login na Cola, abra **Compromissos → Conectar Google Agenda** e autorize a sua conta. O Google retorna ao app pela rota `/agenda?google=connected` (a lista é carregada automaticamente). Para criar um evento, clique **Novo compromisso** ou `+`, preencha e salve.

## Cuidados operacionais

- Não há Google Agenda configurado nem tokens reais dentro do ZIP; o fluxo OAuth não foi validado contra credenciais externas nesta entrega.
- Desconectar remove os tokens salvos na Cola, mas não exclui os eventos existentes no Google. Para revogar a permissão concedida ao aplicativo, a usuária também pode usar a página de segurança da conta Google.
- Não há sincronização em tempo real por webhooks ou push; a tela recarrega os eventos quando o período muda e depois da criação.
- Eventos em outra conta/agenda compartilhada não são buscados automaticamente: esta primeira integração utiliza o calendário `primary` da conta autorizada.
- A escolha de quem pode ver detalhes de cada evento na rede e o suporte a múltiplos calendários exigem etapa posterior de produto/autorização.
- É necessário completar testes de OAuth, expiração e revogação de refresh token, proteção CSRF, permissões Google, horários locais e acessibilidade em ambiente real antes de uso em produção.

## Referências oficiais

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/events/list
- https://supabase.com/docs/guides/functions/auth


### Campos do novo compromisso
O modal inclui **Responsável (opcional)** (e-mail único, convidado no Google Agenda), **Descrição (opcional)** e **Lembrete** (desativado ou antecedência escolhida). O lembrete é salvo como `reminders.useDefault=false` no evento, usando aviso `popup`. O Google envia convites conforme as permissões e preferências da conta. A pessoa responsável informada como convidada não recebe automaticamente permissões de acesso à rede Cola.
