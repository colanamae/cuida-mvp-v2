import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

/** Convites visíveis apenas para administradores pelas políticas RLS existentes. */
export type HomeInvitation = {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type AssignmentAcceptance = { task_id: string; user_id: string };
type CalendarResponsibility = {
  google_event_id: string;
  responsible_member_id: string | null;
};

export function useHomeRelations(householdId?: string, userId?: string) {
  const [acceptances, setAcceptances] = useState<Set<string>>(() => new Set());
  const [invitations, setInvitations] = useState<HomeInvitation[]>([]);
  const [responsibilityByEvent, setResponsibilityByEvent] = useState<
    Record<string, string>
  >({});
  const [relationError, setRelationError] = useState("");
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);

  const refreshRelations = useCallback(async () => {
    if (!householdId || !userId) {
      setAcceptances(new Set());
      setInvitations([]);
      setResponsibilityByEvent({});
      return;
    }
    const [acceptanceResult, inviteResult, responsibilityResult] =
      await Promise.all([
        supabase
          .from("task_assignment_acceptances")
          .select("task_id,user_id")
          .eq("household_id", householdId),
        supabase
          .from("invitations")
          .select("id,email,expires_at,accepted_at,created_at")
          .eq("household_id", householdId)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("calendar_responsibilities")
          .select("google_event_id,responsible_member_id")
          .eq("household_id", householdId)
          .eq("user_id", userId),
      ]);

    const failures: string[] = [];
    if (acceptanceResult.error) failures.push("aceites de tarefas");
    else {
      const values = (acceptanceResult.data || []) as AssignmentAcceptance[];
      setAcceptances(new Set(values.map((a) => `${a.task_id}:${a.user_id}`)));
    }

    // A política de invitations limita a leitura ao admin. Para outros
    // membros, o resultado normalmente será uma lista vazia, não um erro.
    if (inviteResult.error) failures.push("convites da rede");
    else setInvitations((inviteResult.data || []) as HomeInvitation[]);

    if (responsibilityResult.error) failures.push("responsáveis do calendário");
    else {
      const lookup: Record<string, string> = {};
      for (const row of (responsibilityResult.data ||
        []) as CalendarResponsibility[]) {
        if (row.google_event_id && row.responsible_member_id)
          lookup[row.google_event_id] = row.responsible_member_id;
      }
      setResponsibilityByEvent(lookup);
    }

    setRelationError(
      failures.length
        ? `Não conseguimos consultar: ${failures.join(", ")}. Confira as permissões e tente novamente.`
        : "",
    );
  }, [householdId, userId]);

  useEffect(() => {
    void refreshRelations();
  }, [refreshRelations]);

  const acceptTask = useCallback(
    async (taskId: string) => {
      if (!householdId || !userId || acceptingTaskId) return;
      setAcceptingTaskId(taskId);
      setRelationError("");
      try {
        const { error } = await supabase
          .from("task_assignment_acceptances")
          .upsert(
            { task_id: taskId, household_id: householdId, user_id: userId },
            { onConflict: "task_id,user_id", ignoreDuplicates: true },
          );
        if (error) throw error;
        setAcceptances((prev) => new Set(prev).add(`${taskId}:${userId}`));
      } catch {
        setRelationError(
          "Não foi possível aceitar essa responsabilidade. Confira se a tarefa ainda está atribuída a você.",
        );
      } finally {
        setAcceptingTaskId(null);
      }
    },
    [householdId, userId, acceptingTaskId],
  );

  return {
    acceptances,
    invitations,
    responsibilityByEvent,
    relationError,
    acceptingTaskId,
    acceptTask,
    refreshRelations,
  };
}
