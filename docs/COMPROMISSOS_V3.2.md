# Compromissos V3.2 — especificação e limites

A interface em `/agenda` foi redesenhada a partir da referência “App · Agenda da família copy.pdf”.

## Implementado

- Visualizações **Dia, Semana e Mês**; seleção de datas, botão **Hoje** e navegação anterior/próximo.
- Calendário responsivo com data selecionada destacada e chips coloridos por `calendarId`.
- Lista do dia selecionado com horário, título, local, organizador e link para o evento no Google (se fornecidos pelo serviço).
- Estados carregando, desconectado, erro e sem eventos.
- **Não são usados registros `family_events` nem exemplos fictícios**. A tela utiliza exclusivamente a camada `src/services/googleCalendar.ts`.

## Integração com Google Agenda ainda necessária

Para listar eventos reais, implementar a Supabase Edge Function autenticada `google-calendar-events`, com corpo `{ "timeMin": "ISO8601", "timeMax": "ISO8601" }`. Respostas esperadas:

- Sem autorização: `{ "status": "disconnected", "events": [] }`
- Conectado: `{ "status": "connected", "events": [{ "id": "...", "calendarId": "...", "title": "...", "startsAt": "2026-11-06T10:00:00-03:00", "endsAt": "2026-11-06T11:00:00-03:00", "allDay": false, "location": "...", "organizer": "...", "htmlLink": "https://calendar.google.com/..." }] }`

A função deve identificar a pessoa a partir do JWT e não aceitar o identificador da usuária vindo do navegador; deve gerenciar OAuth Google Calendar, refresh tokens criptografados, expiração, revogação, escopos mínimos e tratamento de erros. Não expor credenciais do Google no frontend. Para eventos de dia inteiro, `startsAt` e `endsAt` podem ser datas `YYYY-MM-DD` (fim exclusivo).

**Não há autorização OAuth, Edge Function implantada ou sincronização real nesta versão.** O botão “Como conectar” expande informações sem simular autorização. A API Google Calendar precisará de uma configuração própria para funcionar.

## Validação

- Sintaxe TS/TSX validada por transpilation do TypeScript disponível no ambiente.
- `npm install --offline` não concluiu: dependências não disponíveis no cache npm; portanto, o build e os testes integrados não foram executados.
