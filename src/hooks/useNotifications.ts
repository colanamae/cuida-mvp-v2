import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Task, Event as FamilyEvent } from "../types/models";

export type ColaNotification = {
  id: string;
  title: string;
  detail: string;
  path: string;
  kind: "task" | "event";
  date: string;
};

const UPDATE_EVENT = "cola:notifications-seen-updated";

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function readSeen(key: string): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data)
      ? data.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function useNotifications() {
  const { user, household } = useAuth();
  const householdId = household?.id;
  const userId = user?.id;
  const storageKey = `cola-notifications-seen:${userId || "unknown"}:${householdId || "unknown"}`;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState(() => dateKey(new Date()));

  const refresh = useCallback(async () => {
    if (!householdId || !userId) {
      setTasks([]);
      setEvents([]);
      setLoading(false);
      return;
    }
    try {
      const [nextTasks, nextEvents] = await Promise.all([
        api.tasks(householdId),
        api.events(householdId),
      ]);
      setTasks(nextTasks);
      setEvents(nextEvents);
      setToday(dateKey(new Date()));
      setError("");
    } catch {
      setError("Não conseguimos carregar as notificações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [householdId, userId]);

  useEffect(() => {
    setSeen(readSeen(storageKey));
    const syncSeen = () => setSeen(readSeen(storageKey));
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) syncSeen();
    };
    window.addEventListener(UPDATE_EVENT, syncSeen);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UPDATE_EVENT, syncSeen);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  useEffect(() => {
    setTasks([]);
    setEvents([]);
    setLoading(true);
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const alerts = useMemo<ColaNotification[]>(() => {
    if (!userId) return [];
    const results: ColaNotification[] = [];

    for (const task of tasks) {
      if (task.status === "done" || !task.due_at) continue;
      const assignees = task.assignees || [];
      if (assignees.length > 0 && !assignees.includes(userId)) continue;
      if (
        assignees.length === 0 &&
        task.assigned_to &&
        task.assigned_to !== userId
      )
        continue;
      const due = new Date(task.due_at);
      if (!Number.isFinite(due.getTime())) continue;
      const day = dateKey(due);
      if (day > today) continue;
      results.push({
        id: `task:${task.id}:${day}`,
        title: task.title,
        detail: day < today ? "Tarefa atrasada" : "Tarefa para hoje",
        path: `/tarefas?taskId=${encodeURIComponent(task.id)}`,
        kind: "task",
        date: task.due_at,
      });
    }

    for (const event of events) {
      if (!event.starts_at) continue;
      const starts = new Date(event.starts_at);
      if (!Number.isFinite(starts.getTime()) || dateKey(starts) !== today)
        continue;
      if (event.assigned_to && event.assigned_to !== userId) continue;
      results.push({
        id: `event:${event.id}:${today}`,
        title: event.title,
        detail: `Hoje · ${starts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        path: "/agenda",
        kind: "event",
        date: event.starts_at,
      });
    }
    return results
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "task" ? -1 : 1;
        return a.date.localeCompare(b.date);
      })
      .slice(0, 100);
  }, [tasks, events, today, userId]);

  const seenSet = useMemo(() => new Set(seen), [seen]);
  const unread = alerts.filter((item) => !seenSet.has(item.id)).length;

  const saveSeen = useCallback(
    (ids: string[]) => {
      const unique = [...new Set(ids)];
      setSeen(unique);
      try {
        localStorage.setItem(storageKey, JSON.stringify(unique));
        window.dispatchEvent(new Event(UPDATE_EVENT));
      } catch {
        // Falha de armazenamento não impede o uso da tela nesta sessão.
      }
    },
    [storageKey],
  );

  const markOne = useCallback(
    (id: string) => {
      saveSeen([...seen, id]);
    },
    [saveSeen, seen],
  );

  const markAll = useCallback(() => {
    saveSeen([...seen, ...alerts.map((item) => item.id)]);
  }, [saveSeen, seen, alerts]);

  return {
    alerts,
    unread,
    seen: seenSet,
    loading,
    error,
    refresh,
    markOne,
    markAll,
  };
}
