# V3.7 — Verificação de conflito de horário

No modal **Novo compromisso**, ao clicar em **Salvar compromisso**, a Cola consulta os eventos do Google Agenda conectado para o intervalo informado antes de criar o novo evento.

## Regra

Há conflito quando `novoInicio < existenteFim` **e** `novoFim > existenteInicio` (intervalos de término exclusivo). Assim, um compromisso que termina às 10h e outro que começa às 10h não conflitam. A verificação inclui eventos de dia inteiro e eventos que cruzam a meia-noite.

Quando encontra sobreposição, a interface exibe:

> Você já tem outra atividade nesse horário. Deseja manter as duas?

E apresenta o título das atividades coincidentes e as opções **Rever horário** e **Manter as duas**. A usuária pode manter ambos: o sistema só salva depois da confirmação explícita. Se alterar o início ou fim, a confirmação anterior é invalidada e uma nova consulta é feita.

Se não houver conflito, o compromisso é criado imediatamente. Se a consulta falhar, não se afirma ausência de conflito e o sistema apresenta o erro para nova tentativa.

## Escopo e limitações

- A consulta cobre eventos visíveis pela conta Google conectada à Cola. Eventos de outras contas ou agendas não acessíveis não podem ser considerados.
- A checagem é realizada no momento do salvamento, não é uma garantia contra mudanças simultâneas por outros aplicativos.
- A leitura e criação dependem da integração Google Calendar OAuth configurada no Supabase.
- Não altera nem cancela compromissos existentes; não precisa de migração de banco.

## Testes sugeridos

1. Eventos de 9h–10h e 9h30–10h30: mostrar aviso; **Manter as duas** deve criar o novo evento.
2. Eventos de 9h–10h e 10h–11h: não mostrar aviso.
3. Evento de 8h–12h e novo de 9h–10h: mostrar aviso.
4. Evento de dia inteiro e novo evento com horário no mesmo dia: mostrar aviso.
5. Evento atravessando a meia-noite: detectar a sobreposição no dia seguinte.
6. Após aviso, alterar data ou horário: descartar confirmação e recalcular.
7. Falha na consulta: mostrar erro, sem alegar que não há conflitos.
