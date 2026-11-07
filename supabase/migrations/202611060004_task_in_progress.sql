-- Tarefas: novo estado Em andamento. `open` permanece como A fazer.
-- Aplicar após 202611060003_task_categories_multiple_assignees.sql.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open','in_progress','done'));
CREATE INDEX IF NOT EXISTS tasks_household_status_idx ON public.tasks(household_id,status);
