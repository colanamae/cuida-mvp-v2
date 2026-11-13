import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, configured } from "../services/supabase";
import { Notice, useFeedback } from "../components/UI";
import { ColaBrand } from "./Auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { error, success, run } = useFeedback();

  async function submit(event: FormEvent) {
    event.preventDefault();

    await run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        },
      );

      if (error) throw error;
    }, "Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
  }

  return (
    <div className="auth-shell">
      <div className="auth-info">
        <ColaBrand />

        <div>
          <span className="eyebrow">
            UMA PLATAFORMA PARA O CUIDADO COMPARTILHADO
          </span>

          <h1>Cuidar é um combinado nosso.</h1>

          <p>
            Uma família inteira pode colar no cuidado. Organize a rotina,
            compartilhe responsabilidades e encontre tempo pra você.
          </p>
        </div>

        <small></small>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <ColaBrand mobile />

          <div className="auth-intro">
            <span className="eyebrow">RECUPERAÇÃO DE SENHA</span>
            <h2>Esqueceu a senha?</h2>
            <p>
              Sem problema. Informe o e-mail da sua conta e enviamos um link pra
              você criar uma senha nova.
            </p>
          </div>

          {!configured && (
            <Notice error="Configure o Supabase no arquivo .env para ativar a recuperação de senha." />
          )}

          <label className="auth-field">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>

          <Notice error={error} success={success} />

          <button
            type="submit"
            className="button primary auth-submit"
            disabled={!configured}
          >
            Enviar link
          </button>

          <button
            type="button"
            className="auth-text-link"
            onClick={() => navigate("/")}
          >
            Voltar para o login
          </button>
        </form>
      </div>
    </div>
  );
}
