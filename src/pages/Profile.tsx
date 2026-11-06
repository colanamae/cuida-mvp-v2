import { useEffect, useState, type FormEvent } from "react";
import {
  UserRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../plataforma-v5/src/services/supabase.ts";
import "../../../plataforma-v5/src/styles/profile.css";

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  useEffect(() => {
    setName(
      String(
        user?.user_metadata?.preferred_name ||
          user?.user_metadata?.display_name ||
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          "",
      ),
    );
  }, [
    user?.id,
    user?.user_metadata?.preferred_name,
    user?.user_metadata?.display_name,
    user?.user_metadata?.full_name,
  ]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = name.trim().replace(/\s+/g, " ");
    if (value.length < 2 || value.length > 80) {
      setFeedback({
        type: "error",
        text: "Escolha um nome entre 2 e 80 caracteres.",
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { preferred_name: value },
      });
      if (error) throw error;
      setFeedback({
        type: "success",
        text: "Colou! Vamos chamar você assim daqui pra frente.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Não conseguimos salvar agora. Tente de novo.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error)
      setFeedback({
        type: "error",
        text: "Não conseguimos sair da conta. Tente novamente.",
      });
    else navigate("/entrar", { replace: true });
  }

  return (
    <section className="profile-page">
      <span className="eyebrow">SEU ESPAÇO</span>
      <h1>Perfil</h1>
      <p className="lead">Aqui você escolhe como vamos chamar você.</p>
      <div className="panel profile-panel">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">
            <UserRound size={28} />
          </div>
          <div>
            <h2>Seus dados</h2>
            <p>Você pode atualizar o nome que aparece na sua saudação.</p>
          </div>
        </div>
        <form className="profile-form" onSubmit={save}>
          <label htmlFor="profile-name">Como podemos chamar você?</label>
          <input
            id="profile-name"
            name="preferred_name"
            autoComplete="nickname"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFeedback(null);
            }}
            placeholder="Seu nome de preferência"
          />
          <label htmlFor="profile-email">
            <Mail size={16} /> E-mail da conta
          </label>
          <input
            id="profile-email"
            type="email"
            value={user?.email || ""}
            readOnly
            aria-describedby="profile-email-info"
          />
          <small id="profile-email-info">
            O e-mail é usado para entrar na sua conta.
          </small>
          {feedback && (
            <div
              role="status"
              className={
                "notice " + (feedback.type === "error" ? "error" : "success")
              }
            >
              {feedback.type === "error" ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}{" "}
              {feedback.text}
            </div>
          )}
          <button
            className="button primary profile-submit"
            disabled={saving || name.trim().length < 2}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      </div>
      <button
        type="button"
        className="button outline profile-signout"
        onClick={signOut}
      >
        <LogOut size={17} /> Sair da conta
      </button>
    </section>
  );
}
