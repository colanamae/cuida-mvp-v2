import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  ShoppingBag,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, type CuidaReminder } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import type { Event, Member, Shopping, Task } from "../types/models";

type Filter = "Tudo" | "Tarefa" | "Lembrete" | "Evento" | "Compra";

type RecordItem = {
  id: string;
  kind: Exclude<Filter, "Tudo">;
  title: string;
  date: string | null;
  completed: boolean;
  creator: string | null;
  responsible: string | null;
  assignable: boolean;
};

const filters: Filter[] = ["Tudo", "Tarefa", "Lembrete", "Evento", "Compra"];

const categoryColors = {
  Tarefa: { background: "#DCEEFF", color: "#28577D", border: "#B9D9F4" },
  Evento: { background: "#FFF1C7", color: "#795A12", border: "#F1D98C" },
  Compra: { background: "#DDF3E3", color: "#28613A", border: "#B9E2C5" },
  Lembrete: { background: "#FBE1EB", color: "#873B5B", border: "#F0BED0" },
};

function dateLabel(value: string | null) {
  if (!value) return "Sem data definida";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data definida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function Records() {
  const { household } = useAuth();
  const id = household!.id;

  const { items: tasks, reload: reloadTasks } = useCollection(
    () => api.tasks(id),
    [id],
  );

  const { items: reminders } = useCollection(
    () => api.cuidaReminders(id),
    [id],
  );

  const { items: events, reload: reloadEvents } = useCollection(
    () => api.events(id),
    [id],
  );

  const { items: shopping } = useCollection(() => api.shopping(id), [id]);

  const { items: members } = useCollection(() => api.members(id), [id]);

  const [filter, setFilter] = useState<Filter>("Tudo");
  const [pending, setPending] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const records = useMemo(() => {
    const taskRecords: RecordItem[] = tasks.map((task: Task) => ({
      id: task.id,
      kind: "Tarefa",
      title: task.title,
      date: task.due_at,
      completed: task.status === "done",
      creator: task.thought_by || task.planned_by,
      responsible: task.assignees?.[0] || task.assigned_to,
      assignable: true,
    }));

    const reminderRecords: RecordItem[] = reminders.map(
      (reminder: CuidaReminder) => ({
        id: reminder.id,
        kind: "Lembrete",
        title: reminder.title,
        date: reminder.remind_at,
        completed: reminder.completed,
        creator: reminder.user_id,
        responsible: reminder.user_id,
        assignable: false,
      }),
    );

    const eventRecords: RecordItem[] = events.map((event: Event) => ({
      id: event.id,
      kind: "Evento",
      title: event.title,
      date: event.starts_at,
      completed: false,
      creator: event.created_by,
      responsible: event.assigned_to,
      assignable: true,
    }));

    const shoppingRecords: RecordItem[] = shopping.map((item: Shopping) => ({
      id: item.id,
      kind: "Compra",
      title: item.title,
      date: null,
      completed: item.checked,
      creator: item.created_by,
      responsible: item.created_by,
      assignable: false,
    }));

    return [
      ...taskRecords,
      ...reminderRecords,
      ...eventRecords,
      ...shoppingRecords,
    ].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [tasks, reminders, events, shopping]);

  const visibleRecords = records.filter(
    (record) => filter === "Tudo" || record.kind === filter,
  );

  function memberName(userId: string | null) {
    if (!userId) return "Ninguém definido";
    const member = members.find((item: Member) => item.user_id === userId);
    return member?.display_name || "Pessoa da família";
  }

  function responsibleValue(record: RecordItem) {
    return pending[record.id] !== undefined
      ? pending[record.id]
      : record.responsible || "";
  }

  function changeResponsible(record: RecordItem, userId: string) {
    setPending((current) => ({
      ...current,
      [record.id]: userId,
    }));
    setFeedback("");
    setError("");
  }

  async function saveAll() {
    const changes = Object.entries(pending);

    if (changes.length === 0) {
      setFeedback("Não há alterações para salvar.");
      return;
    }

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      for (const [recordId, userId] of changes) {
        const record = records.find((item) => item.id === recordId);
        if (!record) continue;

        if (record.kind === "Tarefa") {
          await api.save(
            "tasks",
            {
              assignees: userId ? [userId] : [],
              assigned_to: userId || null,
            },
            record.id,
          );
        }

        if (record.kind === "Evento") {
          await api.save(
            "family_events",
            { assigned_to: userId || null },
            record.id,
          );
        }
      }

      setPending({});
      await Promise.all([reloadTasks(), reloadEvents()]);
      setFeedback("Tudo salvo com sucesso!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as alterações.",
      );
    } finally {
      setSaving(false);
    }
  }

  function iconFor(kind: RecordItem["kind"]) {
    if (kind === "Tarefa") return <ClipboardList size={18} />;
    if (kind === "Lembrete") return <Bell size={18} />;
    if (kind === "Evento") return <CalendarDays size={18} />;
    return <ShoppingBag size={18} />;
  }

  const reviewingRecord =
    reviewIndex !== null ? visibleRecords[reviewIndex] : null;

  return (
    <main
      className="records-page"
      style={{ maxWidth: 900, margin: "0 auto", padding: "24px 18px 110px" }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>
          Saiu tudo isso da sua cabeça:
        </h1>
      </header>

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}
      >
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            style={{
              border: "1px solid var(--border, #e5d8d0)",
              borderRadius: 30,
              padding: "9px 15px",
              background:
                filter === item ? "#6E1838" : "var(--raised, #fffcf8)",
              color: filter === item ? "#FFF0B8" : "#6E1838",
              cursor: "pointer",
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}

      {feedback && (
        <p style={{ color: "var(--ink, #2a0716)", fontSize: 14 }}>{feedback}</p>
      )}

      <section style={{ display: "grid", gap: 12 }}>
        {visibleRecords.map((record) => {
          const colors = categoryColors[record.kind];

          return (
            <article
              key={`${record.kind}-${record.id}`}
              style={{
                background: "var(--raised, #fffcf8)",
                border: "1px solid var(--border, #eadfd7)",
                borderRadius: 18,
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <span style={{ color: "var(--muted)", paddingTop: 3 }}>
                  {iconFor(record.kind)}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 30,
                        padding: "5px 11px",
                        fontSize: 12,
                        fontWeight: 600,
                        background: colors.background,
                        color: colors.color,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {record.kind}
                    </span>

                    {record.completed && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        <Check size={13} style={{ display: "inline" }} />{" "}
                        Concluído
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: "9px 0 5px", fontSize: 17 }}>
                    {record.title}
                  </h3>

                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    {dateLabel(record.date)}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  borderTop: "1px solid var(--border, #eadfd7)",
                  paddingTop: 12,
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 4,
                    }}
                  >
                    Quem pensou nisso?
                  </span>
                  <strong style={{ fontSize: 14 }}>
                    {memberName(record.creator)}
                  </strong>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 4,
                    }}
                  >
                    Quem cola?
                  </label>

                  {record.assignable ? (
                    <select
                      value={responsibleValue(record)}
                      disabled={saving}
                      onChange={(event) =>
                        changeResponsible(record, event.target.value)
                      }
                      style={{
                        maxWidth: 190,
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--border, #eadfd7)",
                        background: "var(--raised, #fffcf8)",
                        color: "var(--ink, #2a0716)",
                      }}
                    >
                      <option value="">Ninguém definido</option>
                      {members.map((member: Member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong style={{ fontSize: 14 }}>
                      {memberName(record.responsible)}
                    </strong>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {visibleRecords.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "42px 20px",
              background: "var(--raised, #fffcf8)",
              borderRadius: 18,
            }}
          >
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Ainda não há registros nesta categoria.
            </p>
          </div>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginTop: 24,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setReviewIndex(0);
            setError("");
          }}
          style={{
            minHeight: 48,
            borderRadius: 13,
            border: "1px solid #eadfd7",
            background: "#FFFFFF",
            color: "#6E1838",
            fontWeight: 600,
            cursor: "pointer",
            padding: "10px 12px",
          }}
        >
          Revisar um por um
        </button>

        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          style={{
            minHeight: 48,
            borderRadius: 13,
            border: "1px solid #6E1838",
            background: "#6E1838",
            color: "#FFF0B8",
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
            padding: "10px 12px",
          }}
        >
          {saving ? "Salvando..." : "Salvar tudo"}
        </button>
      </div>

      {reviewingRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(35, 12, 23, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Revisar registro"
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--raised, #fffcf8)",
              borderRadius: 20,
              padding: 22,
              boxShadow: "0 15px 50px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Registro {reviewIndex! + 1} de {visibleRecords.length}
              </span>
              <button
                type="button"
                onClick={() => setReviewIndex(null)}
                aria-label="Fechar revisão"
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--ink, #2a0716)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: 22 }}>
              <span
                style={{
                  display: "inline-block",
                  borderRadius: 30,
                  padding: "5px 11px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: categoryColors[reviewingRecord.kind].background,
                  color: categoryColors[reviewingRecord.kind].color,
                }}
              >
                {reviewingRecord.kind}
              </span>

              <h2 style={{ fontSize: 22, margin: "12px 0 6px" }}>
                {reviewingRecord.title}
              </h2>

              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                {dateLabel(reviewingRecord.date)}
              </p>

              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                Quem pensou nisso? {memberName(reviewingRecord.creator)}
              </p>

              {reviewingRecord.assignable ? (
                <div style={{ marginTop: 20 }}>
                  <label
                    style={{ display: "block", fontSize: 13, marginBottom: 7 }}
                  >
                    Quem cola?
                  </label>
                  <select
                    value={responsibleValue(reviewingRecord)}
                    onChange={(event) =>
                      changeResponsible(reviewingRecord, event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid var(--border, #eadfd7)",
                      background: "var(--raised, #fffcf8)",
                      color: "var(--ink, #2a0716)",
                    }}
                  >
                    <option value="">Ninguém definido</option>
                    {members.map((member: Member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p style={{ marginTop: 20 }}>
                  Quem cola?{" "}
                  <strong>{memberName(reviewingRecord.responsible)}</strong>
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
              <button
                type="button"
                disabled={reviewIndex === 0}
                onClick={() =>
                  setReviewIndex((index) => Math.max(0, (index ?? 0) - 1))
                }
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 10,
                  border: "1px solid #eadfd7",
                  background: "#FFFFFF",
                  color: "#6E1838",
                  cursor: reviewIndex === 0 ? "not-allowed" : "pointer",
                  opacity: reviewIndex === 0 ? 0.45 : 1,
                }}
              >
                <ChevronLeft size={16} style={{ display: "inline" }} /> Anterior
              </button>

              <button
                type="button"
                onClick={() => {
                  if (reviewIndex! >= visibleRecords.length - 1) {
                    setReviewIndex(null);
                  } else {
                    setReviewIndex((index) => (index ?? 0) + 1);
                  }
                }}
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 10,
                  border: 0,
                  background: "#6E1838",
                  color: "#FFF0B8",
                  cursor: "pointer",
                }}
              >
                {reviewIndex === visibleRecords.length - 1
                  ? "Concluir revisão"
                  : "Próximo"}
                {reviewIndex !== visibleRecords.length - 1 && (
                  <ChevronRight size={16} style={{ display: "inline" }} />
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
