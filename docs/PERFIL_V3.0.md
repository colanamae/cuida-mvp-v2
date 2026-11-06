# Perfil — V3.0

- Acesso em `/perfil`, pelo botão **Perfil** no menu lateral desktop, pelo Navigation Drawer no celular e pelo avatar do cabeçalho.
- Nome preferido editável com validação de 2 a 80 caracteres; persistência no `Supabase Auth` em `user_metadata.preferred_name`.
- O dashboard lê `preferred_name` prioritariamente para a saudação.
- E-mail exibido em modo somente leitura.
- Saída da conta disponível.
- A página requer sessão autenticada e casa ativa, conforme o roteador existente.

## Teste manual
1. Entrar e acessar Perfil; salvar nome diferente.
2. Voltar ao Início e conferir saudação e inicial do avatar.
3. Recarregar a página e confirmar persistência.
4. No mobile, abrir o drawer e navegar para Perfil.
5. Testar erro com nome de um caractere e fluxo de saída.
