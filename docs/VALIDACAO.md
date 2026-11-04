# Validação e testes de aceite

## Estado atual

- [x] Estrutura de projeto e arquivos React/TypeScript gerados.
- [x] Scripts SQL, tabelas, índices, funções RPC e políticas RLS escritos.
- [x] Integração frontend com métodos de leitura/escrita Supabase codificada.
- [ ] Instalação npm — **não concluída: dependências indisponíveis no ambiente de execução**.
- [ ] `npm run typecheck` e `npm run build` — não executados com dependências instaladas.
- [ ] Migração aplicada em Supabase — requer projeto e credenciais de teste.
- [ ] Testes integrados com contas diferentes — não executados.
- [ ] Testes automatizados, acessibilidade completa e auditoria de segurança — pendentes.

## Casos obrigatórios para homologação

1. Criar conta, confirmar e-mail, iniciar e encerrar sessão.
2. Criar uma casa, cadastrar pessoa cuidada e convidar outro e-mail. Validar token expirado, já utilizado e e-mail divergente.
3. Conta com escopo `profile` **não** pode consultar tarefas, agenda e transações gerais da casa, nem fichas de outros perfis.
4. Conta com escopo `household` vê informações compartilhadas; dados privados de outra conta (check-ins, chat e transações privadas) retornam zero registros.
5. Criar, atribuir, editar, concluir, reabrir e excluir tarefa. Conferir `planned_by`, `assigned_to`, `completed_by` e log.
6. Criar e excluir compromisso; conferir timezone e calendários diferentes.
7. Registrar check-in, água, movimento e sono; validar que outro membro não tem acesso.
8. Criar refeições, compras, sonhos e lançamentos. Conferir saldo e totalizadores.
9. Executar navegação mobile 320px, tablet e desktop; teclado e leitores de tela; validar contraste e foco.
10. Validar exportação de dados acessíveis e política de retenção/exclusão institucional.

## Riscos conhecidos

Fluxos de alteração de atribuição não têm aprovação do destinatário; a navegação da versão atual não equivale a um sistema de permissões por campo; os cartões e avatares usam substitutos visuais. A aplicação não tem cron jobs, notificações remotas nem testes de carga. Não usar com dados reais de saúde de crianças antes de revisão de segurança, privacidade e conformidade LGPD.
