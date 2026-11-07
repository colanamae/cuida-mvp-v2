import { useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, message } from "../services/api";
import { Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

function ColaAnimationMark() {
  return (
    <div className="onboard-art onboard-art-animated" aria-hidden="true">
      <dotlottie-player
        src="/cola-animation.lottie"
        background="transparent"
        speed="1"
        autoplay
        loop
      ></dotlottie-player>
    </div>
  );
}

export function Onboarding() {
  const [name, setName] = useState("Nossa casa");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const token = params.get("convite");

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (token) await api.acceptInvite(token);
      else await api.createHousehold(name.trim());
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding">
      <ColaAnimationMark />

      <div className="onboard-stack">
        <span className="eyebrow">NOSSA REDE, NOSSA CASA</span>
        <h1>
          {token ? "Você recebeu um convite!" : "Quem está chegando junto?"}
        </h1>
        <p className="onboard-lead">
          {token
            ? "Entre na rede familiar usando o convite recebido."
            : "Vamos criar sua casa. Depois você convida quem cuida com você."}
        </p>

        <form onSubmit={create} className="onboard-form onboard-form-refined">
          {!token && (
            <label>
              Nome da casa
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}

          {error && <div className="notice error">{error}</div>}

          <button className="button primary onboard-submit" disabled={busy}>
            {token ? "Aceitar convite" : "Criar minha casa"} <Users size={18} />
          </button>
        </form>

        <p className="muted small onboard-footnote">
          O acesso aos dados é definido por permissões e vínculos de cuidado.
        </p>
      </div>
    </div>
  );
}
