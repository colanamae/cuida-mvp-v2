# Compromissos V3.6 — Visualizações e responsabilidades

## Visualizações

- **Dia:** coluna de horários de 7h a 22h, eventos com posição e altura calculadas a partir do início e da duração. Eventos sobrepostos aparecem lado a lado. Compromissos de dia inteiro ficam no topo.
- **Semana:** sete colunas com horários compartilhados, rolagem horizontal em celular e seleção do dia pelo cabeçalho.
- **Mês:** grade mensal existente com indicação dos compromissos. A lista abaixo do calendário continua disponível para a data selecionada.
- **Detalhes:** toque no evento da visualização Dia/Semana ou na lista para abrir o bottom sheet com data, horário, local, organizador, convidados retornados pelo Google e responsável na Cola.

## Responsabilidades

A página carrega os membros da casa pela API existente e atribui cores individuais. No bottom sheet, a usuária pode marcar quem vai ao compromisso. As escolhas são armazenadas em `public.calendar_responsibilities`, com acesso **somente à própria usuária autenticada**. Não atribuímos responsabilidade global à família, não enviamos mensagem e não alteramos convidados no Google Agenda. Para convites formais, deve-se seguir o fluxo próprio de inclusão de convidado, com autorização e confirmação.

A listagem e os filtros por pessoa usam essa atribuição pessoal; eventos sem escolha aparecem em “Sem responsável”. O calendário do Google continua sendo a fonte dos eventos.

## Implantação

1. Configurar Supabase e Google Agenda conforme `docs/GOOGLE_AGENDA.md`.
2. Aplicar a migração `supabase/migrations/202611060001_calendar_responsibilities.sql` após as migrações anteriores.
3. Instalar dependências (`npm install`), executar `npm run build` e testar com duas contas e casas distintas.
4. Validar: eventos simultâneos, duração de 15 minutos, eventos que cruzam a meia-noite, compromissos de dia inteiro, agenda desconectada, atribuição e remoção de responsável, filtros e navegação mobile com bottom sheet.

## Limitações

- A sincronização real depende das credenciais OAuth/Google e de Supabase publicados; não foi testada neste ambiente.
- O registro de responsabilidade é **privado da usuária**; não notifica outras pessoas nem implica que um convite tenha sido aceito.
- A janela horária mostra de 7h a 22h, alinhada às referências. Eventos fora do intervalo permanecem disponíveis na lista da data, mas não aparecem no eixo vertical.
