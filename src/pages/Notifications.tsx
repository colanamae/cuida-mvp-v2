import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import "../styles/notifications-page.css";

type Filter = "all" | "unread" | "task" | "event";

export function Notifications() {
  const { alerts, unread, seen, loading, error, refresh, markOne, markAll } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      alerts.filter((item) => {
        if (filter === "unread") return !seen.has(item.id);
        if (filter === "task") return item.kind === "task";
        if (filter === "event") return item.kind === "event";
        return true;
      }),
    [alerts, filter, seen],
  );

  return (
    <section className="cola-notifications-page">
      <header className="cola-notifications-header">
        <div>
          <span className="eyebrow">SUA ROTINA EM DIA</span>
          <h1>Notificações</h1>
          <p className="cola-notifications-lead">
            Veja o que precisa da sua atenção, sem perder os combinados.
          </p>
        </div>
        <div
          className="cola-notifications-summary"
          aria-label={`${unread} notificações não lidas`}
        >
          <Bell size={22} aria-hidden="true" />
          <span>
            {unread} não {unread === 1 ? "lida" : "lidas"}
          </span>
        </div>
      </header>

      <div className="cola-notifications-toolbar">
        <div
          className="cola-notifications-filters"
          aria-label="Filtrar notificações"
        >
          {(
            [
              ["all", "Todas"],
              ["unread", "Não lidas"],
              ["task", "Tarefas"],
              ["event", "Compromissos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`cola-notifications-filter${filter === value ? " active" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="cola-notifications-tools">
          <button
            type="button"
            className="cola-notifications-tool"
            onClick={() => void refresh()}
            aria-label="Atualizar notificações"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          <button
            type="button"
            className="cola-notifications-tool"
            onClick={markAll}
            disabled={!unread}
          >
            <CheckCheck size={17} /> Marcar todas como lidas
          </button>
        </div>
      </div>

      <div className="cola-notifications-panel" aria-live="polite">
        {loading && alerts.length === 0 ? (
          <div className="cola-notifications-empty">
            <RefreshCw size={28} className="cola-notifications-spin" />
            <h2>Buscando seus avisos...</h2>
          </div>
        ) : error ? (
          <div className="cola-notifications-empty" role="alert">
            <Inbox size={36} />
            <h2>Não foi possível carregar</h2>
            <p>{error}</p>
            <button
              type="button"
              className="button outline"
              onClick={() => void refresh()}
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cola-notifications-empty">
            <CheckCircle2 size={40} />
            <h2>Tudo em dia por aqui!</h2>
            <p>
              {filter === "unread"
                ? "Você já conferiu todos os avisos."
                : "Quando houver tarefas ou compromissos para acompanhar, eles aparecerão aqui."}
            </p>
          </div>
        ) : (
          <ul className="cola-notifications-list">
            {filtered.map((item) => {
              const isUnread = !seen.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`cola-notifications-row${isUnread ? " is-unread" : ""}`}
                >
                  <Link
                    className="cola-notifications-entry"
                    to={item.path}
                    onClick={() => markOne(item.id)}
                  >
                    <span
                      className={`cola-notifications-kind cola-notifications-kind--${item.kind}`}
                      aria-hidden="true"
                    >
                      {item.kind === "task" ? (
                        <CheckCheck size={21} />
                      ) : (
                        <CalendarDays size={21} />
                      )}
                    </span>
                    <span className="cola-notifications-details">
                      <span className="cola-notifications-category">
                        {item.kind === "task" ? "TAREFA" : "COMPROMISSO"}
                      </span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    {isUnread && (
                      <span
                        className="cola-notifications-dot"
                        aria-label="Não lida"
                      />
                    )}
                  </Link>
                  {isUnread && (
                    <button
                      type="button"
                      className="cola-notifications-read"
                      onClick={() => markOne(item.id)}
                      aria-label={`Marcar ${item.title} como lida`}
                      title="Marcar como lida"
                    >
                      <CheckCheck size={19} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="cola-notifications-footnote">
        Avisos de tarefas pendentes ou atrasadas e de compromissos do dia. A
        leitura fica registrada neste navegador.
      </p>
    </section>
  );
}
