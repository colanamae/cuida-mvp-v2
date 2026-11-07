import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Cuida, Progress } from "../components/UI";

export function Achievements() {
  const { household } = useAuth(),
    id = household!.id;
  const { items: tasks } = useCollection(() => api.tasks(id), [id]);
  const { items: members } = useCollection(() => api.members(id), [id]);
  const completed = tasks.filter((t) => t.status === "done"),
    ratio = tasks.length
      ? Math.round((completed.length / tasks.length) * 100)
      : 0;
  const summary = members.map((m) => ({
    name: m.display_name,
    color: m.color,
    count: completed.filter((t) => t.completed_by === m.user_id).length,
    planned: tasks.filter((t) => t.planned_by === m.user_id).length,
  }));
  return (
    <>
      <span className="eyebrow">CADA UM COM AS SUAS</span>
      <h1>Conquistas</h1>
      <p className="lead">
        Não é placar, é espelho. Cada contribuição importa.
      </p>
      <div className="panel">
        <h2>Cuidado compartilhado</h2>
        <div className="big-number">{ratio}%</div>
        <p>das tarefas registradas foram concluídas.</p>
        <Progress value={completed.length} max={tasks.length || 1} />
        <div className="metrics">
          <span>{completed.length} concluídas</span>
          <span>{tasks.length} registradas</span>
        </div>
      </div>
      <div className="panel">
        <h2>Quem pensou e quem fez</h2>
        {summary.map((s) => (
          <div className="care-row" key={s.name}>
            <div className="care-label">
              <span className="dot" style={{ background: s.color }} />
              {s.name}
              <small>
                {s.planned} pensadas · {s.count} feitas
              </small>
            </div>
            <Progress value={s.count} max={Math.max(1, completed.length)} />
          </div>
        ))}
      </div>
      <Cuida text="Cuidar junto não é competir. A gente comemora cada responsabilidade assumida." />
    </>
  );
}
