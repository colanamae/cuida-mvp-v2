# Tarefas V4.0 — categoria e múltiplos responsáveis

## Mudanças
- **Categoria opcional:** Saúde, Escola, Casa, Cuidados pessoais. Se nenhuma for escolhida, o valor armazenado é `null`.
- **Quem pensa:** removido do formulário. `planned_by` permanece como autoria imutável para auditoria. O campo legado `thought_by` não é mais preenchido nem exibido pela nova interface.
- **Quem faz:** seleção múltipla por botões de perfil. É possível deixar sem responsável, incluir/remover várias pessoas e editar a seleção existente.
- **Exibição:** cards mostram os avatares de todas as pessoas responsáveis; filtros, resumo na Home, notificações e consultas locais da Cola consideram a lista completa.

## Migração obrigatória no Supabase
Execute, após as migrações anteriores, `supabase/migrations/202611060003_task_categories_multiple_assignees.sql` no SQL Editor, ou aplique com o Supabase CLI conforme seu fluxo de deploy. Não é necessário apagar ou recriar dados.

O schema mantém `assigned_to` preenchido com a primeira pessoa da lista apenas para compatibilidade com clientes antigos; a fonte de verdade é `assignees` (array de UUIDs). O gatilho valida pertencimento à rede da casa e proíbe UUIDs duplicados, convertendo alterações da coluna antiga se houver. As políticas RLS de tarefas permanecem aplicadas. Uma versão antiga do frontend pode sobrescrever a lista ao editar `assigned_to`; atualize todos os clientes juntos.

## Testes manuais sugeridos
1. Criar tarefa sem categoria e sem responsável: exibir `sem responsável`.
2. Criar com categoria Saúde e duas pessoas; verificar persistência, avatares e filtros.
3. Reabrir edição, adicionar/remover pessoas e verificar persistência.
4. Verificar que ambas as pessoas veem a tarefa em **Comigo** e recebem os avisos internos pertinentes.
5. Tentar inserir via API um UUID de fora da casa: o banco deve rejeitar.
6. Executar a migração em banco com tarefas antigas e conferir a recuperação do responsável legado.

**Escopo:** nenhuma notificação externa é enviada ao selecionar responsáveis.
