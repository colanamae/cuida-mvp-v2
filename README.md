# Cola na Mãe — MVP web responsivo

**Cuidar é um combinado nosso.** Aplicação React + TypeScript, com dados persistidos no Supabase/PostgreSQL e controles de acesso por rede familiar. Implementação inicial baseada na proposta FACEPE, no Design System V1 e no storyboard do aplicativo fornecidos.

## Status de entrega

**Código-fonte de MVP inicial, não homologado.** Telas, formulários, persistência via Supabase, SQL e RLS foram escritos. **Não foi possível instalar as dependências nem executar o build nesta sessão**: o ambiente de execução não conseguiu baixar o pacote `@supabase/supabase-js` do registry npm. Não houve conexão com projeto Supabase real, teste fim a fim, auditoria de segurança nem publicação. Todas essas etapas são necessárias antes de produção. A camada de chat atualmente é um conjunto de regras, não um modelo de IA; não existe integração WhatsApp ou Dots ativa. Não há dados fictícios obrigatórios.

## Arquitetura

- **Frontend:** React 19, TypeScript, Vite, React Router, Lucide Icons, CSS responsivo com tokens do Design System.
- **Backend:** Supabase (PostgreSQL + Auth + PostgREST + RLS + funções RPC no banco). A aplicação não utiliza credenciais administrativas no navegador.
- **Organização:** `src/pages` (telas), `components` (UI), `layouts` (estrutura), `routes`, `contexts` (sessão/casa), `hooks` (carregamento), `services` (integração), `types`, `utils`, `styles`.
- **Migração SQL:** `supabase/migrations/202611030001_initial.sql`. Inclui tabelas, índices, funções, convites, RLS e triggers de auditoria.

### Capacidades implementadas no código

| Área | Operações |
|---|---|
| Conta | Criar conta, entrar e sair por Supabase Auth |
| Casa | Criar casa e selecionar uma casa vinculada |
| Rede | Visualizar membros, cadastrar pessoa cuidada, gerar link de convite vinculado ao e-mail, aceitar convite e limitar escopo |
| Tarefas | Criar, listar, filtrar, editar, concluir, reabrir e excluir; separar quem pensou de quem fez |
| Agenda | Visualizar calendário mensal, adicionar e excluir compromisso, definir responsável e pessoa cuidada |
| Bem-estar | Registrar humor, água, movimento e sono, com RLS por usuário |
| Refeições | Registrar refeição e cozinheiro; lista de compras compartilhada e marcação de itens |
| Sonhos | Criar, excluir e registrar valores acumulados |
| Finanças | Receita/despesa, categorias, saldo, lançamentos privados/compartilhados e exclusão |
| Conquistas | Indicadores derivados dos registros de tarefas por quem planejou/concluiu |
| Cuida | Histórico de conversa pessoal e consultas por regras sobre tarefas/agenda |
| Mais | Navegação de serviços e exportação JSON dos dados acessíveis no frontend |

### Limitações explícitas

Ainda não há: login Google; agendamento/lembretes push; envio automático de convites por e-mail; integração WhatsApp Business; agente IA generativo; Dots; importação de agenda Google; entrada por áudio/transcrição; OCR/foto de geladeira; autorizações detalhadas por campo sensível; ficha clínica/documental expandida; troca de guarda compartilhada; trilha completa de exclusão LGPD; assinatura e cobrança; testes automatizados fim a fim. A exportação não inclui arquivos de Storage, convites e log completo. Algumas operações de edição/exclusão são intencionalmente restritas por RLS, mas a interface ainda exige melhoria no tratamento visual de permissão negada. Essas funcionalidades são backlog, não estão incluídas como concluídas.

**Logo:** o PDF orienta utilizar arquivos vetoriais oficiais, mas tais arquivos separados não foram fornecidos. O frontend usa provisoriamente o ícone `Flower2` como marcador de marca (não é o logo oficial). Substituí-lo pelos SVGs oficiais antes do lançamento.

## Executar localmente

Requer Node.js 20+ e uma conta Supabase.

```bash
npm install
cp .env.example .env
```

No Supabase: crie um projeto; em **SQL Editor**, execute por inteiro `supabase/migrations/202611030001_initial.sql`; habilite **Authentication → Providers → Email**; configure as URLs em **Authentication → URL Configuration** (local: `http://localhost:5173`, e a URL da produção). Coloque somente a URL pública e a chave `anon` / `publishable` em `.env`:

```ini
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=CHAVE_PUBLICA
```

Nunca coloque `service_role` no frontend. Em produção, verifique CORS, políticas de acesso, configuração de e-mail de autenticação, HTTPS e rate limiting.

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
```

Acesse `http://localhost:5173`. Crie conta, confirme e-mail (se requerido), crie uma casa e comece a cadastrar dados. Para convites: a administradora gera um link na Rede, compartilha pelo canal de sua preferência; a pessoa convidada deve entrar com o e-mail exato, confirmado, e acessar o link. Convites expiram em 7 dias.

## Implantação

1. Faça a migração no projeto Supabase **de produção** (após testes no staging).
2. Configure Auth / Site URL / Redirect URLs e SMTP transacional para e-mails de produção.
3. Faça `npm run build` e publique o conteúdo de `dist/` em Vercel, Netlify ou outro host estático.
4. Configure as duas variáveis de ambiente `VITE_SUPABASE_*` no host; force HTTPS e fallback de rotas para `/index.html`.
5. Configure backups/PITR, monitoramento, coleta de erros e limites de custo/consulta no Supabase.
6. Teste com duas ou mais contas e com perfis restritos: convites, revalidação de sessão, leitura/escrita permitida/negada e exportação.

Não há necessidade de hospedar um backend Node para a versão entregue; as APIs são disponibilizadas pelo Supabase e funções SQL protegidas. Para produção, recomenda-se mover **ações sensíveis e integrações externas** para Edge Functions.

## Modelo de dados

`households` 1:N `household_members` (contas autorizadas); `households` 1:N `care_profiles` (pessoas e pets cuidados); tarefas e eventos referenciam opcionalmente `care_profile_id`, e membros possuem acesso à casa ou somente à pessoa cuidada. `tasks.planned_by` identifica quem planejou; `tasks.assigned_to` identifica quem executará; `completed_by` e `completed_at` registram execução. `wellbeing_checkins` e `chat_messages` são privados por conta. `transactions` possui visibilidade privada ou compartilhada. `invitations` armazena o e-mail de destino e um token aleatório. `audit_log` recebe alterações de tarefas, eventos e transações.

**RLS:** cada tabela possui políticas. Acesso limitado a uma pessoa cuidada não libera tarefas de escopo geral nem finanças gerais. Há funções `access_level`, `is_member`, `is_admin`, `create_household`, `create_invitation` e `accept_invitation`. É indispensável revisar e testar as políticas com tokens reais e verificar proteção de edição dos campos de associação de uma tarefa/evento em uma auditoria técnica antes de produção.

## Integrações futuras — WhatsApp e Dots

Detalhamento em [`docs/INTEGRACOES.md`](docs/INTEGRACOES.md). As integrações devem usar Edge Functions autenticadas, validar assinatura de webhook e executar operações autorizadas no contexto do usuário; **nunca** dar chave administrativa diretamente ao agente.

## Plano de validação

Consulte [`docs/VALIDACAO.md`](docs/VALIDACAO.md). O build e os testes dependentes do Supabase **não foram executados neste ambiente**. Esta entrega é um ponto de partida funcional em código, não uma certificação de pronto para produção.
