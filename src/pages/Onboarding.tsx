import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, message } from "../services/api";
import "../styles/onboarding-refinement.css";

export function Onboarding() {
  const [name, setName] = useState("Nossa casa");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const token = params.get("convite");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (token) await api.acceptInvite(token);
      else await api.createHousehold(name.trim());
      await refresh(); // AppRoutes mostra a Home; questionário aparece como opcional.
    } catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return (
    <main className="onboarding">
      <section className="onboard-stack" aria-labelledby="onboard-title">
        <img src="/florzinha.png" className="onboard-art-animated" alt="" aria-hidden="true" />
        <span className="eyebrow">NOSSA REDE, NOSSA CASA</span>
        <h1 id="onboard-title">{token ? "Você recebeu um convite!" : "Vamos começar pela sua casa?"}</h1>
        <p className="onboard-lead">{token
          ? "Aceite o convite para entrar na rede e dividir o cuidado."
          : "Para organizar tarefas e compromissos, precisamos criar seu espaço familiar. As seis perguntas de personalização são opcionais e você poderá respondê-las depois."}</p>
        <form onSubmit={create} className="onboard-form onboard-form-refined">
          {!token && <label>Nome da casa<input required maxLength={80} minLength={1} value={name} onChange={(e)=>setName(e.target.value)} /></label>}
          {error && <div className="notice error" role="alert">{error}</div>}
          <button type="submit" className="button primary onboard-submit" disabled={busy || (!token && !name.trim())}>
            {busy ? "Salvando..." : token ? "Aceitar convite" : "Criar minha casa"} <Users size={18}/>
          </button>
        </form>
        <p className="muted small onboard-footnote">Sua casa protege as informações da família. A configuração pessoal da Cola pode ser feita quando você quiser.</p>
      </section>
    </main>
  );
}
