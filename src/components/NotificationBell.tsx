import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, CheckCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Task, Event } from "../types/models";

const dateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
type Alert = {
  id: string;
  title: string;
  detail: string;
  path: string;
  kind: "task" | "event";
};

export function NotificationBell() {
  const { user, household } = useAuth();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  const [seen, setSeen] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const storageKey = `cola-notifications-seen:${user?.id || "unknown"}:${household?.id || "unknown"}`;
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(storageKey) || "[]") as string[]);
    } catch {
      setSeen([]);
    }
  }, [storageKey]);
  useEffect(() => {
    if (!household) return;
    let live = true;
    const load = async () => {
      try {
        const [allTasks, allEvents] = await Promise.all([
          api.tasks(household.id),
          api.events(household.id),
        ]);
        if (live) {
          setTasks(allTasks);
          setEvents(allEvents);
          setError("");
        }
      } catch {
        if (live)
          setError("Não conseguimos carregar os avisos. Tente novamente.");
      }
    };
    void load();
    // Keep notifications current when returning to the tab.
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [household?.id]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const alerts = useMemo(() => {
    if (!user) return [];
    const now = new Date();
    const today = dateKey(now);
    const items: Alert[] = [];
    for (const task of tasks) {
      if (
        task.status === "done" ||
        !task.due_at ||
        ((task.assignees?.length ?? 0) > 0
          ? !task.assignees!.includes(user.id)
          : Boolean(task.assigned_to && task.assigned_to !== user.id))
      )
        continue;
      const date = task.due_at.slice(0, 10);
      if (date > today) continue;
      items.push({
        id: `task:${task.id}:${date}`,
        title: task.title,
        detail: date < today ? "Tarefa atrasada" : "Tarefa para hoje",
        path: "/tarefas",
        kind: "task",
      });
    }
    for (const event of events) {
      if (
        event.starts_at.slice(0, 10) !== today ||
        (event.assigned_to && event.assigned_to !== user.id)
      )
        continue;
      items.push({
        id: `event:${event.id}:${today}`,
        title: event.title,
        detail: `Hoje · ${new Date(event.starts_at).toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`,
        path: "/agenda",
        kind: "event",
      });
    }
    return items.slice(0, 30);
  }, [tasks, events, user?.id]);
  const unread = alerts.filter((a) => !seen.includes(a.id)).length;

  function markAll() {
    const ids = Array.from(new Set([...seen, ...alerts.map((a) => a.id)]));
    setSeen(ids);
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {}
  }

  return (
    <div className="notifications" ref={containerRef}>
      <button
        type="button"
        className="notifications-trigger"
        aria-label={`Notificações${unread ? `: ${unread} não lidas` : ""}`}
        aria-expanded={open}
        aria-controls="notification-list"
        onClick={() => setOpen((x) => !x)}
      >
        <Bell size={21} strokeWidth={1.9} />
        {unread > 0 && (
          <span className="notification-count">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="notifications-popover"
          id="notification-list"
          role="region"
          aria-label="Avisos da família"
        >
          <div className="notifications-heading">
            <strong>Notificações</strong>
            <button
              type="button"
              className="notifications-close"
              onClick={() => setOpen(false)}
              aria-label="Fechar notificações"
            >
              <X size={18} />
            </button>
          </div>
          {error && <p className="notification-error">{error}</p>}
          {!error && alerts.length === 0 && (
            <p className="notification-empty">
              Tudo em dia por aqui. Quando houver tarefas ou compromissos para
              acompanhar, eles aparecem aqui.
            </p>
          )}
          {!error &&
            alerts.map((alert) => (
              <Link
                to={alert.path}
                className={
                  "notification-entry" +
                  (!seen.includes(alert.id) ? " is-unread" : "")
                }
                key={alert.id}
                onClick={() => {
                  markAll();
                  setOpen(false);
                }}
              >
                {alert.kind === "task" ? (
                  <CheckCheck size={19} />
                ) : (
                  <CalendarDays size={19} />
                )}
                <span>
                  <strong>{alert.title}</strong>
                  <small>{alert.detail}</small>
                </span>
              </Link>
            ))}
          {unread > 0 && (
            <button
              type="button"
              className="notifications-mark"
              onClick={markAll}
            >
              Marcar como lidas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
