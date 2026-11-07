# Módulo Tarefas — refinamento visual V3.8

A página `/tarefas` foi ajustada conforme a referência enviada:

- Navegação com abas **Comigo**, **Rede**, **Sem dono** e **Feitas**, com contadores.
- Comigo: tarefas atribuídas à pessoa autenticada (inclusive concluídas).
- Rede: tarefas abertas atribuídas a outras pessoas da casa.
- Sem dono: tarefas abertas sem pessoa responsável.
- Feitas: todas as tarefas concluídas, independente da pessoa responsável.
- Cada cartão exibe o título, a data, quem criou, avatar colorido da pessoa responsável e marcação de conclusão; concluídas ficam riscadas.
- A regra `sem data` e a regra `sem responsável` são exclusivas de tarefas.
- Botão **Nova tarefa** no desktop e botão circular com `+` no mobile.
- Edição e exclusão continuam disponíveis no menu de três pontos de cada tarefa.

A persistência continua utilizando as mesmas operações existentes da tabela `tasks` no Supabase. Não é necessária uma migração adicional.

## Validação

A transpilação sintática do arquivo `Tasks.tsx` foi verificada. O build completo depende da instalação das dependências npm.
