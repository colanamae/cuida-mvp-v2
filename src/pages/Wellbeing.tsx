import { useState } from "react";
import {
  ChevronRight,
  Droplet,
  Frown,
  Heart,
  LockKeyhole,
  Meh,
  Moon,
  Pause,
  PersonStanding,
  Smile,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { api } from "../../src/services/api.ts";
import { useCollection } from "../hooks/useCollection";
import { Notice, useFeedback } from "../components/UI";
import { today } from "../../src/utils/date.ts";

const moods = [
  { key: "leve", label: "Leve", Icon: Smile },
  { key: "ok", label: "Ok", Icon: Smile },
  { key: "cansada", label: "Cansada(o)", Icon: Meh },
  { key: "no_limite", label: "No limite", Icon: Frown },
] as const;

const habitOptions = ["Água", "Sono", "Movimento", "Pausa"];

const suggestions = [
  "10 minutos de leitura hoje? A gente segura o resto.",
  "Que tal respirar fundo e fazer uma pausa?",
  "Um copo de água e alguns minutos para você?",
  "Hoje, tente reservar um tempinho só seu.",
];

export function Wellbeing() {
  const { user, household } = useAuth();
  const id = household!.id;

  const { items, reload } = useCollection(
    () => api.checkins(id, user!.id),
    [id, user?.id],
  );

  const current = items.find((item) => item.day === today());

  const [energy, setEnergy] = useState(2);
  const [sleep, setSleep] = useState("");
  const [showSleepForm, setShowSleepForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingHabits, setEditingHabits] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState(habitOptions);
  const [pauseDone, setPauseDone] = useState(false);
  const [suggestionAccepted, setSuggestionAccepted] = useState(false);

  const { error, success, run } = useFeedback();

  async function update(changes: Record<string, unknown>) {
    await run(async () => {
      await api.save(
        "wellbeing_checkins",
        {
          household_id: id,
          user_id: user!.id,
          day: today(),
          mood: current?.mood || "ok",
          water: current?.water || 0,
          movement: current?.movement || 0,
          sleep_minutes: current?.sleep_minutes ?? null,
          ...changes,
        },
        current?.id,
      );

      await reload();
    });
  }

  function toggleHabit(habit: string) {
    setSelectedHabits((previous) => {
      if (previous.includes(habit)) {
        return previous.filter((item) => item !== habit);
      }

      if (previous.length >= 4) return previous;

      return [...previous, habit];
    });
  }

  function formatSleep(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    return `${hours}h${String(remaining).padStart(2, "0")}`;
  }

  function formatDay(day: string) {
    const [year, month, date] = day.split("-");
    return `${date}/${month}`;
  }

  const water = current?.water || 0;
  const movement = current?.movement || 0;
  const sleepMinutes = current?.sleep_minutes || 0;

  return (
    <div className="wellbeing-page">
      <div className="wellbeing-heading">
        <h1>Só seu</h1>

        <div className="wellbeing-private">
          <LockKeyhole size={14} />
          <span>Este espaço é privado. Ninguém da rede vê.</span>
        </div>
      </div>

      <section className="wellbeing-mood-card">
        <h2>Como você chega hoje?</h2>

        <div className="wellbeing-moods">
          {moods.map(({ key, label, Icon }) => (
            <button
              type="button"
              key={key}
              className={`wellbeing-mood ${
                current?.mood === key ? "selected" : ""
              }`}
              onClick={() => update({ mood: key })}
            >
              <Icon size={30} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="wellbeing-energy">
          <p>
            <strong>Quanta energia sobrou?</strong>
            <span> (opcional)</span>
          </p>

          <div className="wellbeing-energy-options">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                className={energy === value ? "selected" : ""}
                onClick={() => setEnergy(value)}
                aria-label={`Energia ${value} de 5`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="wellbeing-cuida">
          <strong>
            <Sparkles size={14} />
            Cuida
          </strong>
          <p>
            Valeu por contar. Quer que a gente tire alguma coisa do seu dia?
          </p>
        </div>
      </section>

      <section className="wellbeing-habits-section">
        <div className="wellbeing-section-heading">
          <h2>Seus hábitos</h2>

          <button
            type="button"
            className="wellbeing-edit"
            onClick={() => setEditingHabits(!editingHabits)}
          >
            {editingHabits ? "Concluir" : "Editar hábitos"}
          </button>
        </div>

        {editingHabits && (
          <div className="wellbeing-habit-editor">
            <strong>Escolha seus hábitos</strong>
            <p>Escolha até 4 para acompanhar.</p>

            <div>
              {habitOptions.map((habit) => (
                <button
                  type="button"
                  key={habit}
                  className={selectedHabits.includes(habit) ? "selected" : ""}
                  onClick={() => toggleHabit(habit)}
                >
                  {habit}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="wellbeing-habits-grid">
          {selectedHabits.includes("Água") && (
            <article className="wellbeing-habit-card">
              <div className="wellbeing-habit-icon water">
                <Droplet size={22} />
              </div>

              <span className="wellbeing-habit-label">Água</span>
              <strong>{water} de 8 copos</strong>

              <button
                type="button"
                className="wellbeing-habit-button"
                onClick={() => update({ water: Math.min(50, water + 1) })}
              >
                +1 copo
              </button>
            </article>
          )}

          {selectedHabits.includes("Sono") && (
            <article className="wellbeing-habit-card">
              <div className="wellbeing-habit-icon sleep">
                <Moon size={22} />
              </div>

              <span className="wellbeing-habit-label">Sono</span>

              <strong>
                {sleepMinutes > 0
                  ? `Dormiu ${formatSleep(sleepMinutes)}`
                  : "Ainda não registrou"}
              </strong>

              <span className="wellbeing-habit-meta">Meta: 7h</span>

              {showSleepForm ? (
                <div className="wellbeing-sleep-form">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={sleep}
                    onChange={(event) => setSleep(event.target.value)}
                    placeholder="Horas de sono"
                  />

                  <button
                    type="button"
                    className="wellbeing-habit-button"
                    onClick={async () => {
                      const hours = Number(sleep);

                      if (
                        !sleep ||
                        !Number.isFinite(hours) ||
                        hours < 0 ||
                        hours > 24
                      ) {
                        return;
                      }

                      await update({
                        sleep_minutes: Math.round(hours * 60),
                      });

                      setSleep("");
                      setShowSleepForm(false);
                    }}
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="wellbeing-habit-button"
                  onClick={() => setShowSleepForm(true)}
                >
                  Registrar
                </button>
              )}
            </article>
          )}

          {selectedHabits.includes("Movimento") && (
            <article className="wellbeing-habit-card">
              <div className="wellbeing-habit-icon movement">
                <PersonStanding size={23} />
              </div>

              <span className="wellbeing-habit-label">Movimento</span>
              <strong>{movement} min hoje</strong>

              <button
                type="button"
                className="wellbeing-habit-button"
                onClick={() =>
                  update({ movement: Math.min(1440, movement + 10) })
                }
              >
                Registrar
              </button>
            </article>
          )}

          {selectedHabits.includes("Pausa") && (
            <article className="wellbeing-habit-card">
              <div className="wellbeing-habit-icon pause">
                <Pause size={22} />
              </div>

              <span className="wellbeing-habit-label">Pausa</span>

              <strong>
                {pauseDone ? "Pausa registrada!" : "Nenhuma pausa ainda."}
              </strong>

              <p>
                {pauseDone
                  ? "Você reservou um tempinho para si."
                  : "Que tal 5 minutos agora?"}
              </p>

              <button
                type="button"
                className="wellbeing-habit-button"
                onClick={() => setPauseDone(!pauseDone)}
              >
                {pauseDone ? "Desfazer" : "Registrar"}
              </button>
            </article>
          )}
        </div>

        {!editingHabits && (
          <p className="wellbeing-habits-hint">
            Escolha até 4 para acompanhar.
          </p>
        )}
      </section>

      <section className="wellbeing-suggestion">
        <p>{suggestions[new Date().getDate() % suggestions.length]}</p>

        <div>
          <button
            type="button"
            className="wellbeing-suggestion-yes"
            onClick={() => setSuggestionAccepted(true)}
          >
            {suggestionAccepted ? "Combinado!" : "Bora"}
          </button>

          <button
            type="button"
            className="wellbeing-suggestion-no"
            onClick={() => setSuggestionAccepted(false)}
          >
            Hoje não
          </button>
        </div>
      </section>

      <section className="wellbeing-history">
        <button
          type="button"
          className="wellbeing-history-trigger"
          onClick={() => setShowHistory(!showHistory)}
        >
          <strong>Como a semana pesou</strong>
          <ChevronRight size={22} className={showHistory ? "rotated" : ""} />
        </button>

        {showHistory && (
          <div className="wellbeing-history-content">
            {items.length === 0 ? (
              <p>
                Seus registros vão aparecer aqui conforme você fizer check-ins.
              </p>
            ) : (
              items.slice(0, 7).map((item) => (
                <div className="wellbeing-history-item" key={item.id}>
                  <strong>{formatDay(item.day)}</strong>
                  <span>
                    {moods.find((mood) => mood.key === item.mood)?.label ||
                      "Sem humor registrado"}
                  </span>
                  <span>{item.water} copos de água</span>
                  <span>{item.movement} min de movimento</span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <Notice error={error} success={success} />
    </div>
  );
}
