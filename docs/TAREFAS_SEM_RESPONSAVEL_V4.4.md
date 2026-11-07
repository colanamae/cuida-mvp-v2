# Tarefas sem responsável — V4.4

Na aba **Sem responsável**, a apresentação em lista foi substituída por uma fila de distribuição em cartões focados, conforme a referência visual:

- Um cartão por vez, com contador `1 de N`, controles anterior/próximo, ícone, título e indicação de prazo.
- Seleção de uma ou várias pessoas da **Minha rede**, usando cores e iniciais cadastradas.
- Botão **Atribuir tarefa**; ao confirmar, grava os responsáveis na coluna `tasks.assignees` e recarrega os dados.
- A tarefa atribuída deixa de aparecer em **Sem responsável** e passa a **Comigo** ou **Rede** conforme os selecionados.
- A atribuição **não significa aceite**: cada pessoa precisa confirmar individualmente. A indicação **Aguardando** permanece nos cartões normais.
- Filtro **Hoje / Próximos dias / Qualquer data** continua ativo também nessa visualização.
- Os cartões das abas **Comigo** e **Rede** não foram modificados.

## Dependências

Requer as migrações anteriores do projeto, inclusive `202611060003_task_categories_multiple_assignees.sql` e `202611060005_task_assignment_acceptances.sql`. Não exige nova migração.

## Teste recomendado

1. Criar três tarefas sem atribuição; conferir o contador e a navegação.
2. Atribuir a primeira tarefa a duas pessoas; conferir que desaparece da fila e surge em **Rede** ou **Comigo**.
3. Acessar com a conta de cada responsável; conferir **Aguardando** e posterior **Aceitar tarefa**.
4. Aplicar filtro **Hoje** e conferir tarefas sem data excluídas apenas do resultado filtrado.
5. Verificar responsividade e acessibilidade de botões e estados vazios.

**Validação local:** análise sintática dos arquivos TypeScript/TSX; build completo e integração Supabase pendentes.
