import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { ColaAsterisk } from "../components/ColaAsterisk";
import { getWeeklyCuidaInsight } from "../services/cuida";
import type { Member, Task } from "../types/models";

const WINE = "#6E1838";
const YELLOW = "#FFF0B8";

export function WeeklyDistribution() {
  const { household } = useAuth();
  const id = household?.id || "";

  const { items: tasks, loading: tasksLoading } = useCollection(
    () => api.tasks(id),
    [id],
  );

  const { items: members, loading: membersLoading } = useCollection(
    () => api.members(id),
    [id],
  );

  const [reflection, setReflection] = useState("");
  const [insightLoading, setInsightLoading] = useState(true);
  const [insightError, setInsightError] = useState("");

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);

    weekAgo.setDate(now.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    const weekTasks = tasks.filter((task: Task) => {
      const created = new Date(task.created_at);
      return created >= weekAgo && created <= now;
    });

    return members
      .map((member: Member) => {
        const plannedTasks = weekTasks.filter(
          (task: Task) =>
            (task.thought_by || task.planned_by) === member.user_id,
        );

        const completedTasks = weekTasks.filter(
          (task: Task) =>
            task.completed_by === member.user_id && task.status === "done",
        );

        return {
          member,
          thought: plannedTasks.length,
          done: completedTasks.length,
          plannedTasks: plannedTasks
            .map((task: Task) => task.title)
            .filter(Boolean)
            .slice(0, 5),
          completedTasks: completedTasks
            .map((task: Task) => task.title)
            .filter(Boolean)
            .slice(0, 5),
        };
      })
      .sort((a, b) => b.done - a.done);
  }, [tasks, members]);

  const totalThought = stats.reduce((sum, person) => sum + person.thought, 0);

  const totalDone = stats.reduce((sum, person) => sum + person.done, 0);

  useEffect(() => {
    if (tasksLoading || membersLoading || !id) return;

    let active = true;

    async function loadInsight() {
      setInsightLoading(true);
      setInsightError("");

      try {
        const result = await getWeeklyCuidaInsight(
          id,
          stats.map((person) => ({
            name: person.member.display_name,
            thought: person.thought,
            done: person.done,
            planned_tasks: person.plannedTasks,
            completed_tasks: person.completedTasks,
          })),
        );

        if (active) {
          setReflection(result.reply);
        }
      } catch (error) {
        console.error("Erro ao consultar a Cuida:", error);

        if (active) {
          setInsightError(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar a Cuida agora.",
          );
        }
      } finally {
        if (active) {
          setInsightLoading(false);
        }
      }
    }

    loadInsight();

    return () => {
      active = false;
    };
  }, [id, stats, tasksLoading, membersLoading]);

  if (tasksLoading || membersLoading) {
    return <p style={{ padding: 24 }}>Carregando a semana...</p>;
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px 18px 100px",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Como a semana foi dividida</h1>

        <p style={{ color: "var(--muted)", marginTop: 10 }}>
          Não é placar, é espelho.
        </p>
      </header>

      <section
        style={{
          background: "var(--raised)",
          border: "1px solid var(--border, #eadbd2)",
          borderRadius: 18,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          Participação de cada pessoa
        </h2>

        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 20,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 3,
                background: WINE,
                marginRight: 6,
              }}
            />
            Pensou
          </span>

          <span>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 3,
                background: YELLOW,
                marginRight: 6,
              }}
            />
            Fez
          </span>
        </div>

        {stats.map((person) => {
          const total = totalThought + totalDone;
          const thoughtWidth = total > 0 ? (person.thought / total) * 100 : 0;
          const doneWidth = total > 0 ? (person.done / total) * 100 : 0;

          return (
            <article key={person.member.user_id} style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <strong>{person.member.display_name}</strong>

                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  Pensou {person.thought} · Fez {person.done}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  height: 13,
                  width: "100%",
                  background: "var(--sunken, #f0e2d5)",
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${thoughtWidth}%`,
                    background: WINE,
                  }}
                />

                <div
                  style={{
                    width: `${doneWidth}%`,
                    background: YELLOW,
                  }}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          padding: 20,
          borderRadius: 18,
          background: "var(--raised)",
          border: "1px solid var(--border, #eadbd2)",
          marginBottom: 24,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <ColaAsterisk size={42} />
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--muted)",
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            UM OLHAR DO CUIDA
          </p>

          {insightLoading ? (
            <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15 }}>
              Estou olhando para como a semana foi dividida...
            </p>
          ) : insightError ? (
            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
                fontSize: 15,
                color: "var(--muted)",
              }}
            >
              Não consegui analisar a semana agora. Tente atualizar a página.
            </p>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15 }}>
              {reflection}
            </p>
          )}
        </div>
      </section>

      <p
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--muted)",
          fontSize: 13,
        }}
      ></p>
    </main>
  );
}
