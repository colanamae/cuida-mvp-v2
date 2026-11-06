# Rotas removidas na V2.8

Foram excluídas do roteador as URLs `/dia`, `/eu`, `/conquistas` e `/mais`. A expressão “Sua casa” era apenas um título no menu e já estava removida na V2.7.

- O card de tarefas da Home direciona a `/tarefas`.
- Os cards de bem-estar e conquistas foram retirados da Home, evitando links para rotas inexistentes.
- O item **Mais** da barra inferior mobile abre o navigation drawer, não a antiga página `/mais`.
- O código antigo das páginas foi mantido no repositório, mas não é acessível pelas rotas.

**Atenção:** a personalização de nome e a exportação de dados antes presentes em `/mais` deixam de ter interface acessível. Recomenda-se realocar essas opções em uma tela de configurações futuramente. O armazenamento de dados e as tabelas não foram alterados.
