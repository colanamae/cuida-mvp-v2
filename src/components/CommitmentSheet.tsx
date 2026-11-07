import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, MapPin, X } from "lucide-react";
import type { Member } from "../types/models";
import type { GoogleCalendarEntry } from "../services/googleCalendar";
import { calendarEventTime } from "./CalendarTimeline";
import { saveCalendarResponsibility } from "../services/calendarResponsibilities";
import "../styles/commitment-sheet.css";

const longDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

export function CommitmentSheet({
  event,
  members,
  householdId,
  responsibleId,
  color,
  onClose,
  onSaved,
}: {
  event: GoogleCalendarEntry;
  members: Member[];
  householdId: string;
  responsibleId: string | null;
  color: string;
  onClose: () => void;
  onSaved: (memberId: string | null) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(responsibleId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);
  const start = new Date(event.startsAt);

  async function choose(memberId: string | null) {
    setBusy(true);
    setError("");
    try {
      await saveCalendarResponsibility(householdId, event.id, memberId);
      setChosen(memberId);
      onSaved(memberId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não conseguimos salvar quem vai.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="commitment-sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="commitment-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commitment-sheet-title"
      >
        <div className="commitment-sheet-grip" />
        <button
          type="button"
          className="commitment-sheet-close"
          onClick={onClose}
          aria-label="Fechar detalhes"
        >
          <X size={20} />
        </button>
        <div className="commitment-sheet-title">
          <span
            className="commitment-sheet-dot"
            style={{ background: color }}
          />
          <h2 id="commitment-sheet-title">{event.title}</h2>
        </div>
        <p>
          <CalendarDays size={16} /> {longDate(start)} ·{" "}
          {calendarEventTime(event)}
        </p>
        {event.location && (
          <p>
            <MapPin size={16} /> {event.location}
          </p>
        )}
        {event.organizer && (
          <p className="commitment-sheet-organizer">
            Organização: {event.organizer}
          </p>
        )}
        {event.attendees?.length ? (
          <div className="commitment-sheet-guests">
            <strong>Convidados no Google Agenda</strong>
            <p>{event.attendees.join(", ")}</p>
          </div>
        ) : null}
        <div className="commitment-sheet-cola">
          {chosen
            ? `${members.find((m) => m.id === chosen)?.display_name || "Pessoa selecionada"} ficou com esse compromisso na sua organização da Cola.`
            : "Quem vai ficar com esse compromisso?"}
        </div>
        <strong className="commitment-sheet-question">Quem vai?</strong>
        <div
          className="commitment-sheet-members"
          role="group"
          aria-label="Escolher responsável"
        >
          <button
            type="button"
            className={!chosen ? "selected" : ""}
            disabled={busy}
            onClick={() => choose(null)}
          >
            Ninguém ainda
          </button>
          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              disabled={busy}
              className={chosen === member.id ? "selected" : ""}
              onClick={() => choose(member.id)}
            >
              <span
                className="commitment-sheet-avatar"
                style={{ background: member.color }}
              >
                {member.display_name.slice(0, 1).toUpperCase()}
              </span>
              <span>{member.display_name}</span>
            </button>
          ))}
        </div>
        <small className="commitment-sheet-privacy">
          Essa escolha fica registrada na sua Cola. Não envia mensagens ou
          convites pelo Google.
        </small>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {event.htmlLink && (
          <a
            className="commitment-sheet-google"
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver no Google Agenda <ExternalLink size={16} />
          </a>
        )}
      </section>
    </div>
  );
}
