import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  HeartPulse,
  House,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type { Member, Task } from "../types/models";
import { ColaAsterisk } from "./ColaAsterisk.tsx";
import "../styles/unassigned-task-queue.css";

type Props = {
  tasks: Task[];
  members: Member[];
  busy: boolean;
  totalUnassigned: number;
  onAssign: (task: Task, userIds: string[]) => Promise<boolean>;
};

const dateLabel = (due: string | null) => {
  if (!due) return "sem data";
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return "sem data";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const value = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (value.getTime() === today.getTime()) return "hoje";
  if (value.getTime() === tomorrow.getTime()) return "amanhã";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
};

const iconFor = (category: string | null | undefined) => {
  switch (category) {
    case "Saúde":
      return HeartPulse;
    case "Escola":
      return GraduationCap;
    case "Casa":
      return House;
    case "Cuidados pessoais":
      return Sparkles;
    default:
      return ShoppingCart;
  }
};

export function UnassignedTaskQueue({
  tasks,
  members,
  busy,
  totalUnassigned,
  onAssign,
}: Props) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const currentIndex = Math.min(index, Math.max(0, tasks.length - 1));
  const task = tasks[currentIndex];
  const taskId = task?.id;

  useEffect(() => {
    setChosen([]);
  }, [taskId]);
  useEffect(() => {
    if (index >= tasks.length) setIndex(Math.max(0, tasks.length - 1));
  }, [index, tasks.length]);

  const navigate = (step: number) => {
    if (!tasks.length) return;
    setIndex((i) => (i + step + tasks.length) % tasks.length);
    setChosen([]);
  };
  const assign = async () => {
    if (!task || !chosen.length || busy) return;
    const success = await onAssign(task, chosen);
    if (success) setChosen([]);
  };

  if (!tasks.length)
    return totalUnassigned === 0 ? (
      <section
        className="unassigned-empty-success"
        aria-label="Todas as tarefas têm responsável"
        role="status"
      >
        <ColaAsterisk size={120} />
        <h2>Tudo tem alguém responsável</h2>
      </section>
    ) : (
      <div className="unassigned-empty">
        Não há tarefas sem responsável para o prazo escolhido.
      </div>
    );

  const Icon = iconFor(task.category);
  return (
    <section
      className="unassigned-queue"
      aria-label="Distribuir tarefas sem responsável"
    >
      <div className="unassigned-carousel-controls">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Tarefa anterior"
          disabled={tasks.length < 2}
        >
          <ChevronLeft size={19} />
        </button>
        <span className="unassigned-counter" aria-live="polite">
          {currentIndex + 1} de {tasks.length}
        </span>
        <button
          type="button"
          onClick={() => navigate(1)}
          aria-label="Próxima tarefa"
          disabled={tasks.length < 2}
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <article className="unassigned-focus-card" key={task.id}>
        <div className="unassigned-task-symbol">
          <Icon size={39} strokeWidth={1.9} />
        </div>
        <h2>{task.title}</h2>
        <span className="unassigned-date">
          <Clock3 size={15} />
          {dateLabel(task.due_at)}
        </span>
        {task.category && (
          <span className="unassigned-category">{task.category}</span>
        )}
      </article>
      <div className="unassigned-pickers">
        <p>Quem pode cuidar dessa tarefa?</p>
        <div
          className="unassigned-people"
          role="group"
          aria-label="Selecionar responsáveis"
        >
          {members.map((member) => {
            const active = chosen.includes(member.user_id);
            return (
              <button
                key={member.id}
                type="button"
                aria-pressed={active}
                className="unassigned-person"
                onClick={() =>
                  setChosen((current) =>
                    active
                      ? current.filter((id) => id !== member.user_id)
                      : [...current, member.user_id],
                  )
                }
              >
                <span
                  className={`unassigned-person-avatar${active ? " is-selected" : ""}`}
                  style={{ backgroundColor: member.color || "#FEB7B7" }}
                >
                  {member.display_name.trim().charAt(0).toUpperCase()}
                </span>
                <span>{member.display_name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
        {members.length === 0 && (
          <p className="unassigned-no-members">
            Convide pessoas em Minha rede para dividir os cuidados.
          </p>
        )}
        <button
          type="button"
          className="unassigned-assign"
          onClick={assign}
          disabled={!chosen.length || busy}
        >
          {busy
            ? "Salvando…"
            : chosen.length > 1
              ? `Atribuir a ${chosen.length} pessoas`
              : "Atribuir tarefa"}
        </button>
        <small>
          As pessoas selecionadas aparecerão como “Aguardando” até aceitarem a
          tarefa.
        </small>
      </div>
    </section>
  );
}
