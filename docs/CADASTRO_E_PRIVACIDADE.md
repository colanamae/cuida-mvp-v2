# Cadastro e privacidade — V1.3

## Cadastro

A opção **Ainda não tenho conta** abre o formulário com nome, e-mail e senha. A senha pode ser mostrada ou escondida com botão acessível. Para cadastro, são exigidos pelo menos 8 caracteres, uma letra minúscula, uma maiúscula e um número. Essas regras complementam eventuais políticas de senha configuradas no Supabase Auth; se o Supabase exigir mais, a mensagem de erro é mostrada ao usuário.

Antes de enviar o cadastro, a pessoa vê um resumo da utilização dos dados, pode consultar o texto completo dos Termos de Uso e Aviso de Privacidade e deve confirmar uma caixa de aceite não pré-marcada. O botão Criar conta permanece desabilitado até que nome e senha sejam válidos e a caixa esteja marcada. E-mail é validado pelo navegador e Supabase.

O `supabase.auth.signUp` envia o nome em `options.data.display_name`, além das versões dos documentos e horário do aceite em metadados (`terms_version`, `privacy_version`, `accepted_at`). Não armazenamos a senha diretamente nas tabelas da aplicação: ela é processada pelo Supabase Auth. A migração `202611050001_signup_display_name.sql` utiliza o nome no cadastro de membros das casas.

## Atenção antes do lançamento público

Os textos de Termos de Uso e Aviso de Privacidade presentes na tela são **minutas de produto para revisão jurídica**, não políticas finais validadas. Antes do lançamento, definir e inserir: identificação do controlador, canal oficial de privacidade, finalidades e bases legais, fornecedores e fluxos internacionais, prazos de retenção, mecanismos de exercício de direitos (incluindo exclusão), tratamento de dados de crianças e adolescentes e condições definitivas de serviço.

A gravação do aceite em `user_metadata` é útil para a experiência inicial, mas **não é prova imutável ou trilha de auditoria**. Para um lançamento público, registrar consentimentos/aceites de forma confiável no servidor, com versionamento e registros protegidos contra alteração indevida. Aceitar os Termos de Uso e informar a leitura do Aviso de Privacidade não substitui consentimentos específicos que sejam legalmente necessários para finalidades adicionais ou tratamento de dados sensíveis.

## Arquivos alterados

- `src/pages/Auth.tsx`: formulário, regras, visibilidade de senha, textos e aceite.
- `src/styles/auth-refinement.css`: estilos de cadastro e documentos.
- `supabase/migrations/202611050001_signup_display_name.sql`: nome exibido ao criar uma casa ou aceitar convite.

## Tela de resultado do cadastro — V1.4

Após uma resposta sem erro de `supabase.auth.signUp`, o cadastro não fica apenas com um aviso dentro do formulário: a pessoa é redirecionada para `/cadastro/sucesso`, mantendo o estado de confirmação de e-mail retornado pelo Supabase.

- **Confirmação de e-mail ativa (sem sessão):** exibe “Colou! Agora é só conferir seu e-mail.”, o endereço informado, instruções simples e ação “Ir para o login”. A tela não promete que a mensagem foi entregue (isso depende do provedor).
- **Confirmação desativada (sessão criada):** exibe “Você chegou. Que bom ter você aqui!” e ação “Ir para minha casa”.
- **Acesso direto ou recarregamento:** se faltar o estado de navegação, a tela oferece instruções genéricas e evita afirmar a existência de uma conta.
- **Erros de cadastro:** permanecem no formulário e não levam à tela de resultado.

O estado da tela de sucesso não substitui a verificação de conta/identidade do Supabase. A confirmação real é controlada pelo provedor de autenticação.
