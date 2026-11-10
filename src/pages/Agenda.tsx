import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Plus,
  RefreshCw,
  Link2Off,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getGoogleCalendarEvents,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  type GoogleCalendarEntry,
} from "../services/googleCalendar";
import { NewCommitmentModal } from "../components/NewCommitmentModal";
import { CalendarTimeline } from "../components/CalendarTimeline";
import { CommitmentSheet } from "../components/CommitmentSheet";
import {
  getCalendarResponsibilities,
  type CalendarResponsibility,
} from "../services/calendarResponsibilities";
import { api } from "../services/api";
import type { Member } from "../types/models";
import "../styles/commitments.css";

type View = "day" | "week" | "month";
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const TODAY = () => new Date();
const atMidnight = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, count: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
const isoDay = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
const displayDate = (date: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", opts).format(date);

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

function matchesDay(event: GoogleCalendarEntry, day: Date) {
  const dateKey = isoDay(day);
  if (event.allDay) {
    return (
      event.startsAt.slice(0, 10) <= dateKey &&
      (!event.endsAt || event.endsAt.slice(0, 10) > dateKey)
    );
  }
  const d = atMidnight(day).getTime();
  const next = addDays(day, 1).getTime();
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 60000;
  return Number.isFinite(start) && start < next && end > d;
}

function eventTime(entry: GoogleCalendarEntry) {
  if (entry.allDay) return "Dia todo";
  const start = new Date(entry.startsAt);
  if (Number.isNaN(start.getTime())) return "Horário indisponível";
  const time = displayDate(start, { hour: "2-digit", minute: "2-digit" });
  if (!entry.endsAt) return time;
  const end = new Date(entry.endsAt);
  return Number.isNaN(end.getTime())
    ? time
    : `${time}–${displayDate(end, { hour: "2-digit", minute: "2-digit" })}`;
}

function colorFor(calendarId: string, ids: string[]) {
  return ["#FEB7B7", "#B7D9FE", "#D1C360", "#C9D88F", "#D3AFFE"][
    Math.max(0, ids.indexOf(calendarId)) % 5
  ];
}

export function Agenda() {
  const { user, household } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [responsibilities, setResponsibilities] = useState<
    CalendarResponsibility[]
  >([]);
  const [activeEvent, setActiveEvent] = useState<GoogleCalendarEntry | null>(
    null,
  );
  const [responsibilityError, setResponsibilityError] = useState("");
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState<Date>(() => atMidnight(TODAY()));
  const [entries, setEntries] = useState<GoogleCalendarEntry[]>([]);
  const [status, setStatus] = useState<
    "loading" | "connected" | "disconnected" | "error"
  >("loading");
  const [help, setHelp] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [createdMessage, setCreatedMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    if (!household?.id) {
      setMembers([]);
      setResponsibilities([]);
      return;
    }
    Promise.all([
      api.members(household.id),
      getCalendarResponsibilities(household.id),
    ])
      .then(([people, assigned]) => {
        if (active) {
          setMembers(people);
          setResponsibilities(assigned);
          setResponsibilityError("");
        }
      })
      .catch(() => {
        if (active) {
          setMembers([]);
          setResponsibilities([]);
          setResponsibilityError(
            "Não conseguimos carregar as responsabilidades da rede. Confira se a migração V3.6 foi aplicada.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [household?.id]);
  const range = useMemo(() => {
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const last = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
    // Fetch adjacent weeks/months so browsing between views is seamless.
    return { start: addDays(first, -14), end: addDays(last, 14) };
  }, [selected.getFullYear(), selected.getMonth()]);
  useEffect(() => {
    let active = true;
    setStatus("loading");
    getGoogleCalendarEvents(range.start, range.end)
      .then((result) => {
        if (!active) return;
        setEntries(result.events);
        setStatus(result.status);
        setGoogleError("");
      })
      .catch((error) => {
        if (active) {
          setEntries([]);
          setStatus("error");
          setGoogleError(
            error instanceof Error
              ? error.message
              : "Não conseguimos consultar o Google Agenda.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id, range.start.getTime(), range.end.getTime(), refresh]);

  const go = (direction: number) =>
    setSelected((prev) =>
      view === "month"
        ? new Date(
            prev.getFullYear(),
            prev.getMonth() + direction,
            Math.min(
              prev.getDate(),
              new Date(
                prev.getFullYear(),
                prev.getMonth() + direction + 1,
                0,
              ).getDate(),
            ),
          )
        : addDays(prev, direction * (view === "week" ? 7 : 1)),
    );
  const calendarIds = Array.from(new Set(entries.map((e) => e.calendarId)));
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(startOfWeek(addDays(monthEnd, 6)), 6);
  const monthDays = Array.from(
    {
      length:
        Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1,
    },
    (_, i) => addDays(gridStart, i),
  );
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(selected), i),
  );
  const filteredEntries =
    activeFilter === "all"
      ? entries
      : entries.filter((e) => {
          const assigned = responsibilities.find(
            (item) => item.google_event_id === e.id,
          )?.responsible_member_id;
          return activeFilter === "unassigned"
            ? !assigned
            : assigned === activeFilter;
        });
  const eventColor = (event: GoogleCalendarEntry) => {
    const assigned = responsibilities.find(
      (item) => item.google_event_id === event.id,
    )?.responsible_member_id;
    return (
      members.find((member) => member.id === assigned)?.color ||
      colorFor(event.calendarId, calendarIds)
    );
  };
  const selectedEvents = filteredEntries
    .filter((e) => matchesDay(e, selected))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const label =
    view === "month"
      ? displayDate(selected, { month: "long", year: "numeric" })
      : view === "week"
        ? `${displayDate(weekDays[0], {
            day: "2-digit",
            month: "short",
          })} – ${displayDate(weekDays[6], { day: "2-digit", month: "short", year: "numeric" })}`
        : displayDate(selected, {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  function chooseDate(day: Date) {
    setSelected(atMidnight(day));
  }

  async function connect() {
    setWorking(true);
    setGoogleError("");
    try {
      await connectGoogleCalendar();
    } catch (e) {
      setGoogleError(
        e instanceof Error ? e.message : "Não conseguimos iniciar a conexão.",
      );
      setWorking(false);
    }
  }

  async function disconnect() {
    if (
      !window.confirm(
        "Desconectar seu Google Agenda da Cola? Seus compromissos continuarão no Google.",
      )
    )
      return;
    setWorking(true);
    setGoogleError("");
    try {
      await disconnectGoogleCalendar();
      setEntries([]);
      setStatus("disconnected");
    } catch (e) {
      setGoogleError(
        e instanceof Error ? e.message : "Não conseguimos desconectar.",
      );
    } finally {
      setWorking(false);
    }
  }

  function create() {
    if (status === "connected") setModalOpen(true);
    else connect();
  }

  function dayBox(day: Date, detailed = false) {
    const events = filteredEntries
      .filter((e) => matchesDay(e, day))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const isSelected = isoDay(selected) === isoDay(day);
    const isToday = isoDay(TODAY()) === isoDay(day);
    const otherMonth = day.getMonth() !== selected.getMonth();
    return (
      <button
        type="button"
        key={isoDay(day)}
        onClick={() => chooseDate(day)}
        aria-label={`${displayDate(day, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}${events.length ? `, ${events.length} compromissos` : ""}`}
        aria-pressed={isSelected}
        className={`commitment-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${otherMonth ? " other-month" : ""}${detailed ? " detailed" : ""}`}
      >
        <span className="commitment-day-number">{day.getDate()}</span>
        <span className="commitment-day-events">
          {events.slice(0, detailed ? 5 : 2).map((e) => (
            <span
              key={e.id}
              className="commitment-event-chip"
              style={{ background: eventColor(e) }}
              title={e.title}
            >
              {e.title}
            </span>
          ))}
          {events.length > (detailed ? 5 : 2) && (
            <span className="commitment-more">
              +{events.length - (detailed ? 5 : 2)}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="commitments-page">
      <div className="commitments-topbar">
        <div className="commitments-topline">
          <h1>Compromissos</h1>
        </div>
        <button
          type="button"
          className="commitments-create-button"
          onClick={create}
          disabled={working || status === "loading"}
          aria-label="Novo compromisso"
        >
          <Plus size={18} />
          <span>Novo compromisso</span>
        </button>
      </div>
      <div
        className="commitments-tabs"
        role="group"
        aria-label="Visualização do calendário"
      >
        {(
          [
            ["day", "Dia"],
            ["week", "Semana"],
            ["month", "Mês"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            className={view === id ? "active" : ""}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {text}
          </button>
        ))}
      </div>
      <div
        className="commitments-member-filters"
        aria-label="Filtrar compromissos por participante"
      >
        <button
          type="button"
          className={activeFilter === "all" ? "active" : ""}
          onClick={() => setActiveFilter("all")}
        >
          Todos
        </button>
        {members.map((member) => (
          <button
            type="button"
            key={member.id}
            className={activeFilter === member.id ? "active" : ""}
            onClick={() => setActiveFilter(member.id)}
            title={member.display_name}
          >
            <span
              className="commitments-filter-avatar"
              style={{ background: member.color }}
            >
              {member.display_name.slice(0, 1).toUpperCase()}
            </span>
            {member.display_name}
          </button>
        ))}
        <button
          type="button"
          className={activeFilter === "unassigned" ? "active" : ""}
          onClick={() => setActiveFilter("unassigned")}
        >
          Sem responsável
        </button>
      </div>
      <section
        className="commitment-calendar"
        aria-label="Calendário de compromissos"
      >
        <div className="commitments-calendar-head">
          <h2>{label}</h2>
          <div className="commitments-toolbar">
            <button
              type="button"
              className="commitments-today-button"
              onClick={() => chooseDate(TODAY())}
            >
              Hoje
            </button>
            <button
              type="button"
              className="commitments-arrow"
              aria-label="Período anterior"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              className="commitments-arrow"
              aria-label="Próximo período"
              onClick={() => go(1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="commitments-calendar-days">
          {view === "month" && (
            <div className="commitments-weekdays">
              {WEEKDAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          )}
          {view === "month" && (
            <div className="commitments-day-grid">
              {monthDays.map((day) => dayBox(day))}
            </div>
          )}
          {view === "week" && (
            <CalendarTimeline
              days={weekDays}
              events={filteredEntries}
              selected={selected}
              color={eventColor}
              onChoose={chooseDate}
              onOpen={setActiveEvent}
            />
          )}
          {view === "day" && (
            <CalendarTimeline
              days={[selected]}
              events={filteredEntries}
              selected={selected}
              color={eventColor}
              onChoose={chooseDate}
              onOpen={setActiveEvent}
            />
          )}
        </div>
      </section>
      {googleError && (
        <div className="notice error" role="alert">
          {googleError}
        </div>
      )}
      {responsibilityError && (
        <div className="notice error" role="alert">
          {responsibilityError}
        </div>
      )}
      {createdMessage && (
        <div className="notice success" role="status">
          {createdMessage}
        </div>
      )}
      {status !== "connected" ? (
        <div className="commitments-connect" role="status">
          <CalendarDays size={22} />
          <div>
            <strong>
              {status === "loading"
                ? "Consultando sua conexão…"
                : status === "error"
                  ? "Não conseguimos acessar o Google Agenda."
                  : "Conecte seu Google Agenda"}
            </strong>
            <p>
              {status === "loading"
                ? ""
                : status === "error"
                  ? "Confira a conexão ou tente novamente."
                  : "Autorize a Cola para criar e consultar compromissos sem sair da plataforma."}
            </p>
            {help && (
              <p className="commitments-help">
                Você será direcionada ao Google apenas uma vez para autorizar o
                acesso aos eventos. A Cola não compartilhará automaticamente sua
                agenda com outras pessoas da rede.
              </p>
            )}
          </div>
          <div className="commitments-connection-actions">
            {status !== "loading" && (
              <button
                type="button"
                className="button primary"
                disabled={working}
                onClick={connect}
              >
                {working ? "Conectando…" : "Conectar Google Agenda"}
              </button>
            )}
            {status === "error" && (
              <button
                type="button"
                className="commitments-help-button"
                onClick={() => {
                  setGoogleError("");
                  setRefresh((n) => n + 1);
                }}
              >
                <RefreshCw size={16} />
                Tentar novamente
              </button>
            )}
            <button
              type="button"
              className="commitments-help-button"
              onClick={() => setHelp(!help)}
              aria-expanded={help}
            >
              <Info size={16} />
              {help ? "Fechar detalhes" : "Como funciona"}
            </button>
          </div>
        </div>
      ) : (
        <div className="commitments-connected">
          <span>
            <CalendarDays size={16} /> Google Agenda conectado
          </span>
          <button type="button" onClick={disconnect} disabled={working}>
            <Link2Off size={15} /> Desconectar
          </button>
        </div>
      )}
      <section
        className="commitments-agenda"
        aria-label="Compromissos da data selecionada"
      >
        <h2>
          {displayDate(selected, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h2>
        {status === "connected" && selectedEvents.length ? (
          <div className="commitments-list">
            {selectedEvents.map((event) => (
              <article key={event.id} className="commitments-item">
                <button
                  type="button"
                  className="commitment-list-details"
                  onClick={() => setActiveEvent(event)}
                  aria-label={`Ver detalhes de ${event.title}`}
                >
                  <span
                    className="commitments-color"
                    style={{ background: eventColor(event) }}
                  />
                  <span className="commitments-time">{eventTime(event)}</span>
                  <div className="commitments-detail">
                    <strong>{event.title}</strong>
                    {event.location && <small>{event.location}</small>}
                    {event.organizer && (
                      <small>Organização: {event.organizer}</small>
                    )}
                  </div>
                </button>
                {event.htmlLink && (
                  <a
                    className="commitments-open"
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${event.title} no Google Agenda`}
                  >
                    <ExternalLink size={17} />
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="commitments-no-events">
            {status === "connected"
              ? "Nenhum compromisso nessa data."
              : "Conecte o Google Agenda para visualizar os compromissos desta data."}
          </div>
        )}
      </section>
      {activeEvent && household?.id && (
        <CommitmentSheet
          key={activeEvent.id}
          event={activeEvent}
          members={members}
          householdId={household.id}
          responsibleId={
            responsibilities.find((r) => r.google_event_id === activeEvent.id)
              ?.responsible_member_id || null
          }
          color={eventColor(activeEvent)}
          onClose={() => setActiveEvent(null)}
          onSaved={(memberId) =>
            setResponsibilities((previous) => [
              ...previous.filter(
                (item) => item.google_event_id !== activeEvent.id,
              ),
              {
                google_event_id: activeEvent.id,
                responsible_member_id: memberId,
              },
            ])
          }
        />
      )}
      {modalOpen && (
        <NewCommitmentModal
          date={selected}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            setCreatedMessage("Colou! Compromisso salvo no Google Agenda.");
            setRefresh((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
