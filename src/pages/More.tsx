import { Link } from "react-router-dom";
import {
  Users,
  CheckCheck,
  ChartNoAxesColumn,
  Wallet,
  Heart,
  CalendarDays,
  Shield,
  Download,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, message } from "../../../plataforma-v5/src/services/api.ts";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../plataforma-v5/src/services/supabase.ts";

export function More() {
  const { user, household } = useAuth();
  const [error, setError] = useState("");
  const [preferred, setPreferred] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState("");
  useEffect(() => {
    setPreferred(
      String(
        user?.user_metadata?.preferred_name ||
          user?.user_metadata?.display_name ||
          user?.user_metadata?.full_name ||
          "",
      ),
    );
  }, [
    user?.id,
    user?.user_metadata?.preferred_name,
    user?.user_metadata?.display_name,
  ]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const normalized = preferred.trim();
    if (normalized.length < 2) {
      setNameFeedback("Digite um nome de pelo menos 2 letras.");
      return;
    }
    setSavingName(true);
    setNameFeedback("");
    const { error } = await supabase.auth.updateUser({
      data: { preferred_name: normalized },
    });
    setNameFeedback(
      error
        ? "Não conseguimos salvar seu nome. Tente novamente."
        : "Pronto! Vamos chamar você assim.",
    );
    setSavingName(false);
  }

  async function exportData() {
    try {
      const id = household!.id;
      const [
        tasks,
        events,
        profiles,
        meals,
        shopping,
        dreams,
        transactions,
        checkins,
        chat,
      ] = await Promise.all([
        api.tasks(id),
        api.events(id),
        api.profiles(id),
        api.meals(id),
        api.shopping(id),
        api.dreams(id),
        api.transactions(id),
        api.checkins(id, user!.id),
        api.chat(id, user!.id),
      ]);
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              household,
              tasks,
              events,
              profiles,
              meals,
              shopping,
              dreams,
              transactions,
              checkins,
              chat,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cola-na-mae-meus-dados.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(message(e));
    }
  }

  const links = [
    ["/rede", "Nossa rede e permissões", Users],
    ["/tarefas", "Tarefas", CheckCheck],
    ["/conquistas", "Como a semana foi dividida", ChartNoAxesColumn],
    ["/agenda", "Agenda familiar", CalendarDays],
    ["/financas", "Finanças", Wallet],
    ["/eu", "Meu bem-estar", Heart],
  ] as const;
  return (
    <>
      <span className="eyebrow">SUA CASA, SUAS ESCOLHAS</span>
      <h1>Mais opções</h1>
      <form className="panel preferred-name" onSubmit={saveName}>
        <h2>Como podemos chamar você?</h2>
        <p>Escolha o nome que aparece na saudação da sua casa.</p>
        <label htmlFor="preferred-name-input">Nome de preferência</label>
        <div className="preferred-name-actions">
          <input
            id="preferred-name-input"
            autoComplete="nickname"
            maxLength={80}
            minLength={2}
            required
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
          />
          <button className="button primary" disabled={savingName}>
            {savingName ? "Salvando..." : "Salvar nome"}
          </button>
        </div>
        {nameFeedback && (
          <p role="status" className="preferred-name-feedback">
            {nameFeedback}
          </p>
        )}
      </form>
      <div className="options-grid">
        {links.map(([path, label, Icon]) => (
          <Link className="option-card" key={path} to={path}>
            <Icon size={25} />
            <strong>{label}</strong>
          </Link>
        ))}
      </div>
      <div className="panel">
        <h2>
          <Shield size={20} /> Seus dados são seus
        </h2>
        <p>
          A plataforma não usa seus dados para publicidade. Confira e exporte as
          informações que sua conta pode acessar.
        </p>
        <button className="button outline" onClick={exportData}>
          <Download size={16} /> Baixar meus dados acessíveis
        </button>
        {error && <p className="notice error">{error}</p>}
        <p className="muted small">
          Para solicitar exclusão completa da conta e dados relacionados,
          utilize os controles administrativos do Supabase até a implantação de
          um fluxo verificado de exclusão.
        </p>
      </div>
    </>
  );
}
