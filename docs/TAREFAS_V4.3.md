# Tarefas V4.3 — agrupamento por responsáveis

O módulo de Tarefas apresenta três abas exclusivas, com contadores calculados a partir de **todas** as tarefas acessíveis à conta:

- **Comigo:** tarefas em que a pessoa autenticada está na lista de responsáveis, inclusive quando há outras pessoas atribuídas;
- **Rede:** tarefas atribuídas a outras pessoas, sem incluir a pessoa autenticada;
- **Sem responsável:** tarefas cuja lista de responsáveis está vazia.

Tarefas concluídas continuam visíveis em sua aba, com o estilo riscado e a pílula Feito. As ações de iniciar, concluir, reabrir, editar, excluir e aceitar atribuição foram preservadas.

O botão **Filtrar por prazo** oferece **Qualquer data**, **Hoje** e **Próximos dias** (de amanhã até sete dias à frente). O prazo limita os registros exibidos mas **não altera os totais das abas**. Tarefas sem data aparecem quando o prazo está em Qualquer data.

Nenhuma migração adicional é necessária além das migrations da V4.2. Atualização visual e de filtro; permanece necessário executar `npm install`, `npm run build` e testes com Supabase configurado para validação completa.
