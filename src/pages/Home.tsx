import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCollection } from "../hooks/useCollection";
import { api } from "../../../plataforma-v5/src/services/api.ts";
import {
  greetingForHour,
  preferredName,
  fullDate,
} from "../../../plataforma-v5/src/utils/greeting.ts";
import { today } from "../../../plataforma-v5/src/utils/date.ts";
import { ColaAsterisk } from "../components/ColaAsterisk";
import type { Member, Task } from "../../../plataforma-v5/src/types/models.ts";
import "../../../plataforma-v5/src/styles/home-compact-cards.css";

function asValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shortDate(value: string | null | undefined): string {
  const date = asValidDate(value);
  if (!date) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function timeOrDate(value: string | null | undefined): string {
  const date = asValidDate(value);
  if (!date) return "sem data";
  // A data só ganha horário quando o registro inclui a hora de fato.
  return /T\d\d:\d\d/.test(value || "")
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : shortDate(value);
}

function responsibleName(
  userId: string | null | undefined,
  members: Member[],
): string {
  if (!userId) return "sem responsável";
  const name = members
    .find((member) => member.user_id === userId)
    ?.display_name?.trim();
  return name || "sem responsável";
}

type PreviewItem = {
  id: string;
  title: string;
  date?: string;
  responsible?: string;
};
type PreviewKind = "tasks" | "general";
type PreviewCardProps = {
  heading: string;
  title: string;
  url: string;
  tone: string;
  items: PreviewItem[];
  emptyText: string;
  kind?: PreviewKind;
};

function PreviewCard({
  heading,
  title,
  url,
  tone,
  items,
  emptyText,
  kind = "general",
}: PreviewCardProps) {
  return (
    <Link className={`home-preview-card home-preview-card--${tone}`} to={url}>
      <span className="home-preview-heading">{heading}</span>
      <h2>{title}</h2>
      <div className="home-preview-items">
        {items.length ? (
          items.slice(0, 3).map((item) => (
            <div className="home-preview-item" key={item.id}>
              <div className="home-preview-item-main">
                {(kind === "tasks" || item.date) && (
                  <span className="home-preview-time">
                    {kind === "tasks" ? item.date || "sem data" : item.date}
                  </span>
                )}
                <strong>{item.title}</strong>
              </div>
              {(kind === "tasks" || item.responsible) && (
                <span className="home-preview-responsible">
                  {kind === "tasks"
                    ? `Responsável: ${item.responsible || "sem responsável"}`
                    : item.responsible}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="home-preview-empty">{emptyText}</div>
        )}
      </div>
    </Link>
  );
}

function taskPreview(task: Task, members: Member[]): PreviewItem {
  return {
    id: task.id,
    title: task.title,
    date: timeOrDate(task.due_at),
    responsible:
      (task.assignees?.length
        ? task.assignees
        : task.assigned_to
          ? [task.assigned_to]
          : []
      )
        .map((id) => responsibleName(id, members))
        .join(", ") || "sem responsável",
  };
}

export function Home() {
  const { household, user } = useAuth();
  const id = household!.id;
  const { items: tasks, loading: tasksLoading } = useCollection(
    () => api.tasks(id),
    [id],
  );
  const { items: members, loading: membersLoading } = useCollection(
    () => api.members(id),
    [id],
  );
  const { items: profiles, loading: profilesLoading } = useCollection(
    () => api.profiles(id),
    [id],
  );
  const { items: dreams, loading: dreamsLoading } = useCollection(
    () => api.dreams(id),
    [id],
  );

  const now = new Date();
  const name = preferredName(
    user?.user_metadata,
    members.find((member) => member.user_id === user?.id)?.display_name,
  );
  const currentDay = today();
  const tasksForToday = tasks
    .filter(
      (task) =>
        task.status !== "done" &&
        (!task.due_at || task.due_at.slice(0, 10) === currentDay),
    )
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
  const careMembers = members.map((member) => ({
    id: member.id,
    title: member.display_name,
    responsible: "Pessoa da rede",
  }));
  const dreamItems: PreviewItem[] = dreams.map((dream) => ({
    id: dream.id,
    title: dream.title,
    responsible: `Criado por: ${responsibleName(dream.created_by, members)}`,
  }));

  return (
    <>
      <div className="eyebrow home-date">{fullDate(now)}</div>
      <h1>
        {greetingForHour(now.getHours())}, {name}
      </h1>
      <Link
        to="/cuida"
        className="cola-ai-card"
        aria-labelledby="cola-ai-title"
      >
        <div className="cola-ai-avatar">
          <ColaAsterisk size={70} />
        </div>
        <div className="cola-ai-copy">
          <h2 id="cola-ai-title">Esvazie a sua mente</h2>
          <p>Me fale tudo, que separo e organizo.</p>
        </div>
      </Link>
      <div className="home-compact-grid">
        <PreviewCard
          heading="TAREFAS"
          title="Tarefas"
          url="/tarefas"
          tone="pink"
          kind="tasks"
          items={tasksForToday.map((task) => taskPreview(task, members))}
          emptyText={
            tasksLoading || membersLoading
              ? "Carregando tarefas..."
              : "Nenhuma tarefa pendente para hoje."
          }
        />
        <Link
          className="home-preview-card home-preview-card--blue home-google-calendar"
          to="/agenda"
        >
          <span className="home-preview-heading">COMPROMISSOS</span>
          <h2>Google Agenda</h2>
          <div className="home-preview-empty" role="status">
            <strong>Integração em preparação</strong>
            <span>
              Os compromissos do Google Agenda aparecerão aqui após a integração
              ser configurada.
            </span>
          </div>
        </Link>
        <PreviewCard
          heading="MINHA REDE"
          title={`${members.length} cuidam · ${profiles.length} são cuidados`}
          url="/rede"
          tone="olive"
          items={careMembers}
          emptyText={
            membersLoading || profilesLoading
              ? "Carregando rede..."
              : "Sua rede ainda não tem integrantes."
          }
        />
        <PreviewCard
          heading="MAPA DOS SONHOS"
          title="Sonhos da família"
          url="/sonhos"
          tone="lilac"
          items={dreamItems}
          emptyText={
            dreamsLoading
              ? "Carregando sonhos..."
              : "Que tal adicionar o primeiro sonho?"
          }
        />
      </div>
    </>
  );
}
