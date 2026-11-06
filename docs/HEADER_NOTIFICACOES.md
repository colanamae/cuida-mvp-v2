# Cabeçalho, saudação e notificações (V2.0)

- Data por extenso usando `Intl.DateTimeFormat('pt-BR')` e data local do dispositivo.
- Saudação: **Bom dia** (05:00–11:59), **Boa tarde** (12:00–17:59) ou **Boa noite** (18:00–04:59).
- Nome: `user_metadata.preferred_name` definido em **Mais opções > Como podemos chamar você?**. Na ausência, são usados `display_name`, `full_name`, `name` ou o nome na rede de cuidado. Não se deriva nome do e-mail.
- Sino: exibe tarefas abertas vencidas/para hoje e compromissos de hoje, filtrando tarefas e compromissos atribuídos à pessoa autenticada ou sem responsável, sempre respeitando as permissões RLS do Supabase.
- Os avisos são derivados dos registros já disponíveis; não são push notifications e não enviam mensagens externas.
- Estado **lido** é armazenado no `localStorage` do navegador, por usuário e casa. Não sincroniza entre dispositivos. Um produto de produção deve utilizar uma tabela própria e notificações em tempo real.
- A lista é atualizada ao montar e ao retornar o foco à janela. Um botão permite marcar os avisos como lidos.
- A atualização do nome utiliza `supabase.auth.updateUser` e os metadados da pessoa autenticada; o Supabase precisa estar configurado.
