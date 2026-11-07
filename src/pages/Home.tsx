import { Link } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Heart,
  Users,
  Sparkles,
  Wallet,
  Utensils,
  ArrowRight,
  Flower2,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useCollection } from "../hooks/useCollection";
<<<<<<< Updated upstream
import { Cuida } from "../components/UI";
import { today } from "../utils/date";
=======
import { api } from "../services/api";

import { greetingForHour, preferredName, fullDate } from "../utils/greeting";

import { today } from "../utils/date";
import { ColaAsterisk } from "../components/ColaAsterisk";
import type { Member, Task } from "../types/models";
import "../styles/home-compact-cards.css";

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
>>>>>>> Stashed changes

export function Home() {
  const { household, user } = useAuth();
  const id = household!.id;

  const { items: tasks } = useCollection(() => api.tasks(id), [id]);
  const { items: events } = useCollection(() => api.events(id), [id]);
  const { items: members } = useCollection(() => api.members(id), [id]);
  const { items: profiles } = useCollection(() => api.profiles(id), [id]);

  const { items: checkins } = useCollection(
    () => api.checkins(id, user!.id),
    [id, user?.id],
  );

  const due = tasks.filter((t) => t.due_at?.slice(0, 10) === today());
  const done = due.filter((t) => t.status === "done").length;

  const missing = due.filter(
    (t) => !t.assigned_to && t.status !== "done",
  ).length;

  const memberName = members.find((m) => m.user_id === user?.id)?.display_name;

  const profileName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.display_name;

  const rawName =
    profileName || memberName || user?.email?.split("@")[0] || "você";

  const myName = rawName
    .replace(/[._-]+/g, " ")
    .replace(/\d+$/, "")
    .trim()
    .split(/\s+/)[0];

  const greetingName =
    myName.charAt(0).toUpperCase() + myName.slice(1).toLowerCase();

  const todayEvents = events.filter(
    (e) => e.starts_at.slice(0, 10) === today(),
  ).length;

  const waterCount = Math.min(8, Math.max(0, checkins[0]?.water || 0));

  const taskProgress = due.length > 0 ? (done / due.length) * 100 : 0;

  const cards = [
    {
      url: "/agenda",
      title: "Agenda",
      sub: `${todayEvents} compromissos hoje`,
      icon: CalendarDays,
      theme: "blue",
      big: new Date().getDate().toString(),
      meta: new Date().toLocaleDateString("pt-BR", {
        month: "long",
      }),
    },
    {
      url: "/rede",
      title: "Rede",
      sub: `${members.length} cuidam · ${profiles.length} são cuidados`,
      icon: Users,
      theme: "olive",
      big: members.map((m) => m.display_name[0]).join(" · ") || "+",
    },
    {
      url: "/eu",
      title: "Eu",
      sub: checkins[0]
        ? `Água: ${waterCount}/8 · movimento: ${checkins[0].movement}min`
        : "Um momento só seu",
      icon: Heart,
      theme: "white",
      big: checkins[0]?.mood || "♡",
    },
    {
      url: "/conquistas",
      title: "Conquistas",
      sub: "Cada cuidado dividido importa",
      icon: Sparkles,
      theme: "peach",
      big: "✦",
    },
  ];

  return (
    <div className="home-dashboard">
      <div className="eyebrow">
        {household?.name.toUpperCase()} · NOSSA EXPERIÊNCIA
      </div>

      <h1>Oi, {greetingName}</h1>

      <p className="lead">
        Tem coisa pra dividir. Você não precisa lembrar de tudo sozinha.
      </p>

      <Cuida
        text={`${due.length} coisas hoje, ${due.filter((t) => t.assigned_to).length} com dono. Começo por onde?`}
        action={
          <Link className="button outline" to="/tarefas">
            Vamos organizar <ArrowRight size={16} />
          </Link>
        }
      />

      <section className="home-grid home-grid-updated">
        {/* BLOCO HOJE */}
        <Link to="/dia" className="dashboard-card pink home-today-card">
          <div className="circle-icon">
            <Check size={23} />
          </div>

          <div className="card-bottom">
            <div
              className="home-task-progress"
              style={{
                background: `conic-gradient(#B85F78 ${taskProgress}%, rgba(255,255,255,0.55) 0%)`,
              }}
            >
              <div className="home-task-progress-inner">
                <strong>
                  {done}/{due.length}
                </strong>
                <small>feitas</small>
              </div>
            </div>

            <strong>Hoje</strong>

            <small>
              {due.length} tarefas · {missing} sem responsável
            </small>
          </div>

          <span className="home-card-arrow">
            <ArrowRight size={20} />
          </span>
        </Link>

        {/* DEMAIS BLOCOS */}
        {cards.map((c) => (
          <Link
            to={c.url}
            className={`dashboard-card ${c.theme} home-small-card`}
            key={c.url}
          >
            <div className="circle-icon">
              <c.icon size={23} />
            </div>

            <div className="card-bottom">
              <div className="card-big">{c.big}</div>

              {/* 8 QUADRINHOS DE ÁGUA */}
              {c.url === "/eu" && (
                <div
                  className="home-water-squares"
                  aria-label={`${waterCount} de 8 copos de água`}
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <span
                      key={index}
                      className={
                        index < waterCount
                          ? "home-water-square filled"
                          : "home-water-square"
                      }
                    />
                  ))}
                </div>
              )}

              <strong>{c.title}</strong>
              <small>{c.sub}</small>
            </div>
          </Link>
        ))}
      </section>

      {/* ATALHOS MENORES */}
      <div className="quick-links">
        <Link to="/sonhos">
          <Sparkles size={18} /> Sonhos
        </Link>

        <Link to="/refeicoes">
          <Utensils size={18} /> Refeições
        </Link>

        <Link to="/financas">
          <Wallet size={18} /> Finanças
        </Link>

        <Link to="/cuida">
          <Flower2 size={18} /> Conversar com a Cuida
        </Link>
      </div>
    </div>
  );
}
