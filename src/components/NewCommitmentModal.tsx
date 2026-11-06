import { useEffect, useState, type FormEvent } from "react";
import { X, LockKeyhole } from "lucide-react";
import {
  createGoogleCalendarEvent,
  getGoogleCalendarEvents,
  type GoogleCalendarEntry,
} from "../../../plataforma-v5/src/services/googleCalendar.ts";
import { overlappingCalendarEvents } from "../../../plataforma-v5/src/services/calendarConflicts.ts";
import "../../../plataforma-v5/src/styles/new-commitment.css";

function formatInput(date: Date) {
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

function initialTime(day: Date) {
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(day);
  end.setHours(10, 0, 0, 0);
  return [formatInput(start), formatInput(end)];
}

export function NewCommitmentModal({
  date,
  onClose,
  onCreated,
}: {
  date: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [startDefault, endDefault] = initialTime(date);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(startDefault);
  const [end, setEnd] = useState(endDefault);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [reminder, setReminder] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<GoogleCalendarEntry[]>([]);
  const [confirmedInterval, setConfirmedInterval] = useState("");
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = old;
    };
  }, [onClose]);
  const currentInterval = `${start}|${end}`;
  const clearConflict = () => {
    setConflicts([]);
    setConfirmedInterval("");
  };

  async function persist(
    startDate: Date,
    endDate: Date,
    responsibleEmail: string,
  ) {
    setBusy(true);
    try {
      await createGoogleCalendarEvent({
        title: title.trim(),
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        location: location.trim(),
        description: description.trim(),
        responsibleEmail: responsibleEmail || undefined,
        reminderMinutes: reminder === "none" ? null : Number(reminder),
      });
      onCreated();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não conseguimos salvar o compromisso.",
      );
    } finally {
      setBusy(false);
    }
  }

  function validate() {
    const startDate = new Date(start),
      endDate = new Date(end);
    if (!title.trim()) {
      setError("Informe o nome do compromisso.");
      return null;
    }
    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      endDate <= startDate
    ) {
      setError(
        "Confira as datas. O horário de término precisa ser depois do início.",
      );
      return null;
    }
    const responsibleEmail = responsible.trim().toLowerCase();
    if (
      responsibleEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleEmail)
    ) {
      setError("Confira o e-mail da pessoa responsável.");
      return null;
    }
    return { startDate, endDate, responsibleEmail };
  }

  async function save(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setError("");
    const valid = validate();
    if (!valid) return;
    if (conflicts.length && confirmedInterval === currentInterval) {
      await persist(valid.startDate, valid.endDate, valid.responsibleEmail);
      return;
    }
    setBusy(true);
    try {
      // Consultamos todos os eventos do intervalo, não só os dias visíveis no calendário.
      const result = await getGoogleCalendarEvents(
        new Date(valid.startDate.getTime() - 86400000),
        new Date(valid.endDate.getTime() + 86400000),
      );
      if (result.status === "disconnected") {
        setError(
          "Conecte seu Google Agenda para verificar os horários e salvar o compromisso.",
        );
        return;
      }
      const matches = overlappingCalendarEvents(
        result.events,
        valid.startDate,
        valid.endDate,
      );
      if (matches.length) {
        setConflicts(matches);
        setConfirmedInterval(currentInterval);
        return;
      }
      await createGoogleCalendarEvent({
        title: title.trim(),
        startsAt: valid.startDate.toISOString(),
        endsAt: valid.endDate.toISOString(),
        location: location.trim(),
        description: description.trim(),
        responsibleEmail: valid.responsibleEmail || undefined,
        reminderMinutes: reminder === "none" ? null : Number(reminder),
      });
      onCreated();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não conseguimos verificar os compromissos. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function keepBoth() {
    if (busy || confirmedInterval !== currentInterval) return;
    setError("");
    const valid = validate();
    if (valid)
      await persist(valid.startDate, valid.endDate, valid.responsibleEmail);
  }

  return (
    <div
      className="new-commitment-overlay"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <section
        className="new-commitment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-commitment-heading"
      >
        <div className="new-commitment-head">
          <div>
            <span className="eyebrow">GOOGLE AGENDA</span>
            <h2 id="new-commitment-heading">Novo compromisso</h2>
          </div>
          <button
            type="button"
            className="new-commitment-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={21} />
          </button>
        </div>
        <form className="new-commitment-form" onSubmit={save}>
          <label>
            Nome do compromisso
            <input
              required
              autoFocus
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Consulta pediátrica"
            />
          </label>
          <div className="new-commitment-fields">
            <label>
              Início
              <input
                required
                id="new-commitment-start"
                type="datetime-local"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  clearConflict();
                }}
              />
            </label>
            <label>
              Término
              <input
                required
                id="new-commitment-end"
                type="datetime-local"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  clearConflict();
                }}
                min={start}
              />
            </label>
          </div>
          <label>
            Local
            <input
              maxLength={500}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Endereço ou link da reunião"
            />
          </label>
          <label>
            Responsável (opcional)
            <input
              type="email"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="E-mail de quem vai ficar responsável"
            />
            <small>
              Opcional. Se você informar um e-mail, o Google poderá enviar um
              convite para essa pessoa.
            </small>
          </label>
          <label>
            Descrição (opcional)
            <textarea
              maxLength={2000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte o que é importante sobre esse compromisso"
            />
          </label>
          <label>
            Lembrete
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
            >
              <option value="none">Sem lembrete</option>
              <option value="0">Na hora do compromisso</option>
              <option value="5">5 minutos antes</option>
              <option value="10">10 minutos antes</option>
              <option value="15">15 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="120">2 horas antes</option>
              <option value="1440">1 dia antes</option>
            </select>
            <small>O aviso será configurado no Google Agenda conectado.</small>
          </label>
          <div className="new-commitment-privacy">
            <LockKeyhole size={18} />
            <span>
              Vamos salvar este compromisso no Google Agenda conectado à sua
              conta. Ele não será compartilhado automaticamente com toda a rede
              da Cola.
            </span>
          </div>
          {conflicts.length > 0 && confirmedInterval === currentInterval && (
            <div
              className="new-commitment-conflict"
              role="alert"
              aria-live="assertive"
            >
              <strong>
                Você já tem outra atividade nesse horário. Deseja manter as
                duas?
              </strong>
              <ul>
                {conflicts.slice(0, 3).map((event) => (
                  <li key={`${event.calendarId}-${event.id}`}>{event.title}</li>
                ))}
                {conflicts.length > 3 && (
                  <li>E mais {conflicts.length - 3} atividade(s).</li>
                )}
              </ul>
              <div className="new-commitment-conflict-actions">
                <button
                  type="button"
                  className="button outline"
                  onClick={() => {
                    clearConflict();
                    document.getElementById("new-commitment-start")?.focus();
                  }}
                  disabled={busy}
                >
                  Rever horário
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={keepBoth}
                  disabled={busy}
                >
                  {busy ? "Salvando…" : "Manter as duas"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="new-commitment-actions">
            <button
              type="button"
              className="text-button"
              onClick={onClose}
              disabled={busy}
            >
              Agora não
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={busy || !title.trim() || conflicts.length > 0}
            >
              {busy ? "Salvando…" : "Salvar compromisso"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
