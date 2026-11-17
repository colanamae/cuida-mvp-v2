import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, ClipboardList, Mic, Plus, RefreshCw, ShieldCheck,
  Settings2, Users, X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { supabase } from "../services/supabase";
import { greetingForHour, preferredName, fullDate } from "../utils/greeting";
import { ColaAsterisk } from "../components/ColaAsterisk";
import type { Member, Task } from "../types/models";
import { useHomeRelations } from "../hooks/useHomeRelations";
import "../styles/home-dashboard-v3.css";

type CalendarItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location?: string;
  responsibleMemberId?: string | null;
};

type SetupState = { answers: string[]; dismissed: boolean; completed: boolean };
const QUESTION_COUNT = 6;

function localDay(date: Date): string {
  const y = date.getFullYear();
  return `${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function calendarDay(iso: string): string {
  // Google all-day events use YYYY-MM-DD without timezone.
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : localDay(new Date(iso));
}
function isValidDate(value: string | null | undefined): boolean {
  return !!value && Number.isFinite(new Date(value).getTime());
}
function clockTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Dia todo";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function shortName(member: Member | undefined, fallback = "Pessoa da rede"): string {
  return member?.display_name?.trim() || fallback;
}
function hasAssignee(task: Task, userId?: string): boolean {
  if (!userId) return false;
  const assignees = task.assignees || [];
  return assignees.includes(userId) || task.assigned_to === userId;
}
function getTaskOwner(task: Task, members: Member[]): string {
  const id = task.assignees?.[0] || task.assigned_to;
  return id ? shortName(members.find((m) => m.user_id === id), "Responsável") : "Sem responsável";
}
function weekEventsForUser(events: CalendarItem[], responsibilityByEvent: Record<string, string>, memberId: string): number {
  return events.filter((event) => responsibilityByEvent[event.id] === memberId).length;
}

function readSetup(key: string): SetupState {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null") as Partial<SetupState> | null;
    return {
      answers: Array.isArray(value?.answers) ? value.answers.slice(0, QUESTION_COUNT) : [],
      dismissed: value?.dismissed === true,
      completed: value?.completed === true,
    };
  } catch {
    return { answers: [], dismissed: false, completed: false };
  }
}

export function Home() {
  const { household, user } = useAuth();
  const householdId = household?.id;
  const userId = user?.id;
  const storageKey = `cola:home-setup-v3:${userId || "guest"}:${householdId || "none"}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupState>(() => readSetup(storageKey));
  const [showDoneBanner, setShowDoneBanner] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const {
    acceptances, invitations, responsibilityByEvent, relationError,
    acceptTask, acceptingTaskId, refreshRelations,
  } = useHomeRelations(householdId, userId);


  useEffect(() => {
    let active = true;
    setSetup(readSetup(storageKey));
    setShowDoneBanner(true);
    if (userId && householdId) {
      void supabase.from("cola_home_preferences")
        .select("answers,dismissed,completed")
        .eq("user_id", userId)
        .eq("household_id", householdId)
        .maybeSingle()
        .then(({data, error}) => {
          if (!active || error || !data) return;
          setSetup({
            answers: Array.isArray(data.answers) ? data.answers.filter((value: unknown): value is string => typeof value === "string").slice(0, 6) : [],
            dismissed: data.dismissed === true,
            completed: data.completed === true,
          });
        });
    }
    return () => { active = false; };
  }, [storageKey, userId, householdId]);
  const persistSetup = useCallback((value: SetupState) => {
    setSetup(value);
    try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* storage disabled */ }
    if (userId && householdId) {
      void supabase.from("cola_home_preferences").upsert({
        user_id: userId, household_id: householdId, answers: value.answers,
        completed: value.completed, dismissed: value.dismissed,
        updated_at: new Date().toISOString(),
      }, {onConflict: "user_id,household_id"}).then(({error}) => {
        if (error) console.warn("Preferências locais preservadas; sincronização indisponível.");
      });
    }
  }, [storageKey, userId, householdId]);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    setError("");
    try {
      const [nextTasks, nextMembers] = await Promise.all([api.tasks(householdId), api.members(householdId)]);
      setTasks(nextTasks);
      setMembers(nextMembers);
    } catch {
      setError("Não conseguimos carregar a rotina agora. Tente novamente.");
    }
    // Google Agenda é a fonte de verdade de Compromissos da plataforma.
    try {
      const beginning = startOfDay(new Date());
      const ending = startOfDay(addDays(beginning, 7));
      const { data, error: calendarError } = await supabase.functions.invoke("google-calendar", {
        body: { action: "list", timeMin: beginning.toISOString(), timeMax: ending.toISOString() },
      });
      if (calendarError) throw calendarError;
      if (data?.status === "connected") {
        setCalendarConnected(true);
        setEvents(Array.isArray(data.events) ? data.events.map((event: Record<string, unknown>) => ({
          id: String(event.id || ""), title: String(event.title || "Sem título"),
          startsAt: String(event.startsAt || ""), endsAt: event.endsAt ? String(event.endsAt) : null,
          allDay: event.allDay === true, location: String(event.location || ""),
        })).filter((e: CalendarItem) => e.id && e.startsAt) : []);
      } else { setCalendarConnected(false); setEvents([]); }
    } catch {
      // Não esconder tarefas ou rede quando a integração do Google estiver indisponível.
      setCalendarConnected(null);
      setEvents([]);
    } finally { setLoading(false); setNow(new Date()); }
  }, [householdId]);

  useEffect(() => {
    void load();
    const refreshOnFocus = () => { void load(); void refreshRelations(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [load, refreshRelations]);

  const today = localDay(now);
  const name = preferredName(user?.user_metadata, members.find((m) => m.user_id === userId)?.display_name);
  const todayEvents = useMemo(() => events.filter((e) => calendarDay(e.startsAt) === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [events, today]);
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status !== "done" && (!t.due_at || calendarDay(t.due_at) <= today))
    .sort((a, b) => (a.due_at || "9999").localeCompare(b.due_at || "9999")), [tasks, today]);
  const upcomingTasks = useMemo(() => tasks.filter((t) => t.status !== "done" && t.due_at && isValidDate(t.due_at) && calendarDay(t.due_at) >= today && calendarDay(t.due_at) < localDay(addDays(now, 7))), [tasks, today, now]);
  const overdue = pendingTasks.filter((t) => !!t.due_at && calendarDay(t.due_at) < today && hasAssignee(t, userId));
  const unassigned = pendingTasks.filter((t) => !(t.assignees?.length || t.assigned_to));
  const awaitingAcceptance = pendingTasks.filter((task) => hasAssignee(task, userId) && !!userId && !acceptances.has(`${task.id}:${userId}`));
  const network = members.filter((m) => m.user_id && m.user_id !== userId);
  const pendingInvitations = invitations.filter((i) => !i.accepted_at && new Date(i.expires_at).getTime() > now.getTime());
  const expiredInvitations = invitations.filter((i) => !i.accepted_at && new Date(i.expires_at).getTime() <= now.getTime());
  const isAdmin = members.some((m) => m.user_id === userId && m.role === "admin");
  const memberById = new Map(members.map((m) => [m.id, m]));
  const weeklyByMember = members.map((member) => {
    const assignedTasks = upcomingTasks.filter((task) => hasAssignee(task, member.user_id)).length;
    const assignedEvents = weekEventsForUser(events, responsibilityByEvent, member.id);
    return { member, assignedTasks, assignedEvents };
  }).filter((entry) => entry.assignedTasks + entry.assignedEvents > 0);
  const unassignedWeeklyTasks = upcomingTasks.filter((task) => !task.assigned_to && !(task.assignees?.length)).length;
  const unassignedWeeklyEvents = events.filter((event) =>
    calendarDay(event.startsAt) >= today && !responsibilityByEvent[event.id]
  ).length;

  const weekEvents = events.filter((e) => calendarDay(e.startsAt) >= today);
  const weekCount = upcomingTasks.length + weekEvents.length;
  const configurationProgress = Math.min(setup.answers.length, QUESTION_COUNT);
  const showSetupBanner = !setup.completed && !setup.dismissed;
  const showOperational = todayEvents.length > 0 || pendingTasks.length > 0 || weekCount > 0;

  async function completeTask(task: Task) {
    if (savingTask) return;
    setSavingTask(task.id);
    try {
      const { error: updateError } = await supabase.from("tasks").update({ status: "done" }).eq("id", task.id).eq("household_id", householdId!);
      if (updateError) throw updateError;
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: "done" } : item));
    } catch {
      setError("Não foi possível concluir a tarefa. Confira suas permissões e tente novamente.");
    } finally { setSavingTask(null); }
  }

  return (
    <section className="cola-home-v3">
      <header className="home-v3-heading">
        <span className="home-v3-date">{fullDate(now)}</span>
        <h1>{greetingForHour(now.getHours())}, {name}</h1>
      </header>

      {relationError && <div className="home-v3-error" role="alert">{relationError}<button type="button" onClick={() => void refreshRelations()}>Tentar novamente</button></div>}

      {error && <div className="home-v3-error" role="alert">{error}<button type="button" onClick={() => void load()}>Tentar novamente</button></div>}

      {showSetupBanner && (
        <div className="home-v3-setup-banner">
          <div className="home-v3-setup-icon" aria-hidden="true"><ColaAsterisk size={54}/></div>
          <div className="home-v3-setup-content">
            <h2>{configurationProgress ? "Falta pouco pra Cola ficar com a sua cara" : "Vamos deixar a Cola com a sua cara?"}</h2>
            <p>{configurationProgress ? `Você respondeu ${configurationProgress} de 6 perguntas. Leva uns 2 minutos.` : "6 perguntas rápidas sobre a sua rotina. Leva uns 2 minutos."}</p>
            {configurationProgress > 0 && <div className="home-v3-progress" aria-label={`${configurationProgress} de 6 perguntas respondidas`}><span style={{width: `${(configurationProgress/6)*100}%`}} /></div>}
            <div className="home-v3-setup-buttons">
              <Link className="home-v3-primary" to="/configurar-cola">{configurationProgress ? "Continuar configuração" : "Começar configuração"}</Link>
              <button type="button" className="home-v3-text-button" onClick={() => persistSetup({...setup, dismissed:true})}>Agora não</button>
            </div>
          </div>
        </div>
      )}

      {setup.completed && showDoneBanner && (
        <div className="home-v3-complete" role="status">
          <Check size={18}/>
          <div><strong>Tudo pronto!</strong><p>Suas respostas foram salvas. Você pode revê-las quando quiser.</p></div>
          <button type="button" aria-label="Dispensar mensagem" onClick={() => setShowDoneBanner(false)}><X size={17}/></button>
        </div>
      )}

      {showOperational && (
        <Link to="/cuida" className="home-v3-ai-prompt">
          <span className="home-v3-ai-tiny"><ColaAsterisk size={27}/></span>
          <span>O que está na sua cabeça? Escreva ou fale...</span>
          <span className="home-v3-ai-mic"><Mic size={17}/></span>
        </Link>
      )}

      <div className="home-v3-columns">
        <div className="home-v3-stack">
          <section className="home-v3-card home-v3-today" aria-labelledby="home-v3-today-title">
            <div className="home-v3-card-head"><div><h2 id="home-v3-today-title">Hoje</h2>{todayEvents.length > 0 && <small>Seus compromissos do dia</small>}</div><Link to="/agenda">Ver agenda</Link></div>
            {loading ? <div className="home-v3-loading"><RefreshCw size={18}/> Carregando rotina...</div> : todayEvents.length ? (
              <div className="home-v3-events">
                {todayEvents.slice(0, 6).map((event) => {
                  const starts = new Date(event.startsAt);
                  const mins = starts.getTime() - now.getTime();
                  const soon = !event.allDay && mins >= 0 && mins <= 30 * 60000;
                  return <Link to="/agenda" className={`home-v3-event${soon ? " is-soon" : ""}`} key={event.id}>
                    <time>{event.allDay ? "Dia todo" : clockTime(event.startsAt)}</time>
                    <span className="home-v3-event-detail"><strong>{event.title}</strong>{event.location && <small>{event.location}</small>}</span>
                    {responsibilityByEvent[event.id] && <span className="home-v4-event-owner">{shortName(memberById.get(responsibilityByEvent[event.id]), "Responsável")}</span>}
                    {soon ? <span className="home-v3-soon">Em {Math.max(1, Math.ceil(mins / 60000))} min</span> : <ChevronRight size={16} />}
                  </Link>;
                })}
              </div>
            ) : (
              <div className="home-v3-empty">
                <div className="home-v3-empty-symbol" aria-hidden="true">✳</div>
                <strong>Dia livre por enquanto</strong>
                <p>{calendarConnected === false ? "Conecte o Google Agenda para ver seus compromissos aqui." : calendarConnected === null ? "Não foi possível consultar o Google Agenda agora." : "Nada combinado pra hoje ainda. Quando a rede combinar algo, aparece aqui."}</p>
                <Link className="home-v3-outlined" to="/agenda">{calendarConnected === false ? "Ir para agenda" : "Criar compromisso"}</Link>
              </div>
            )}
          </section>

          {(pendingTasks.length > 0 || showOperational) && (
            <section className="home-v3-card" aria-labelledby="home-v3-tasks-title">
              <div className="home-v3-card-head"><h2 id="home-v3-tasks-title">Suas tarefas pra hoje</h2><Link to="/tarefas">Ver tarefas</Link></div>
              {pendingTasks.length ? <div className="home-v3-task-list">{pendingTasks.slice(0, 5).map((task) => {
                const delayed = !!task.due_at && calendarDay(task.due_at) < today;
                const assignedToMe = hasAssignee(task, userId);
                const accepted = !!userId && acceptances.has(`${task.id}:${userId}`);
                return <div className="home-v3-task" key={task.id}>
                  <button type="button" className="home-v3-task-check" disabled={savingTask === task.id} aria-label={`Concluir ${task.title}`} onClick={() => void completeTask(task)}><span/></button>
                  <div className="home-v3-task-body"><strong>{task.title}</strong><div className="home-v3-task-tags">
                    {delayed && <span className="is-late">Atrasada</span>}
                    {task.due_at && !delayed && <span><Clock3 size={11}/> {calendarDay(task.due_at) === today ? "Hoje" : "Prazo"} {clockTime(task.due_at)}</span>}
                    <span>{getTaskOwner(task, members)}</span>
                    {assignedToMe && <span className={accepted ? "home-v4-accepted" : "home-v4-awaiting"}>{accepted ? "Aceita por você" : "Aguardando seu aceite"}</span>}
                  </div>
                  {assignedToMe && !accepted && <button type="button" className="home-v4-accept-button" disabled={acceptingTaskId === task.id} onClick={() => void acceptTask(task.id)}><ShieldCheck size={13}/>{acceptingTaskId === task.id ? "Aceitando..." : "Aceitar responsabilidade"}</button>}
                  </div>
                </div>;
              })}</div> : <div className="home-v3-mini-empty"><CheckCircle2 size={25}/><span>Sem tarefas pendentes por hoje.</span><Link to="/tarefas">Criar tarefa</Link></div>}
            </section>
          )}
        </div>

        <div className="home-v3-stack">
          {(overdue.length > 0 || unassigned.length > 0 || awaitingAcceptance.length > 0) && (
            <section className="home-v3-card" aria-labelledby="home-v3-attention-title">
              <div className="home-v3-card-head"><h2 id="home-v3-attention-title">Precisa de você</h2><span className="home-v3-badge">{new Set([...overdue, ...unassigned, ...awaitingAcceptance].map((item) => item.id)).size}</span></div>
              <div className="home-v3-attention-list">
                {overdue.slice(0, 2).map((task) => <Link key={`late:${task.id}`} to="/tarefas" className="home-v3-attention"><span className="home-v3-attention-icon">!</span><span><strong>{task.title}</strong><small>Tarefa atrasada · {getTaskOwner(task, members)}</small></span><ChevronRight size={15}/></Link>)}
                {awaitingAcceptance.filter((t) => !overdue.some((o) => o.id === t.id)).slice(0, 2).map((task) => <div key={`accept:${task.id}`} className="home-v3-attention"><span className="home-v3-attention-icon muted"><ShieldCheck size={13}/></span><span><strong>{task.title}</strong><small>Responsabilidade aguardando seu aceite</small></span><button type="button" className="home-v4-inline-accept" disabled={acceptingTaskId === task.id} onClick={() => void acceptTask(task.id)}>{acceptingTaskId === task.id ? "..." : "Aceitar"}</button></div>)}
                {unassigned.slice(0, 2).map((task) => <Link key={`unassigned:${task.id}`} to="/tarefas" className="home-v3-attention"><span className="home-v3-attention-icon muted"><Users size={13}/></span><span><strong>Sem responsável: {task.title}</strong><small>Combine quem poderá cuidar disso</small></span><ChevronRight size={15}/></Link>)}
              </div>
            </section>
          )}

          {showOperational && (
            <section className="home-v3-card" aria-labelledby="home-v3-week-title">
              <div className="home-v3-card-head"><div><h2 id="home-v3-week-title">Semana da família</h2><small>Próximos 7 dias · compromissos e tarefas</small></div></div>
              <div className="home-v3-week-summary">
                <div className="home-v3-week-count"><CalendarDays size={18}/><strong>{weekEvents.length}</strong><span>compromissos</span></div>
                <div className="home-v3-week-count"><ClipboardList size={18}/><strong>{upcomingTasks.length}</strong><span>tarefas</span></div>
              </div>
              <div className="home-v3-week-progress"><span style={{width: `${weekCount ? Math.min(100, weekEvents.length / weekCount * 100) : 0}%`}}/></div>
              <div className="home-v4-week-people">
                {weeklyByMember.map(({ member, assignedTasks, assignedEvents }) => (
                  <div className="home-v4-week-person" key={member.id}>
                    <span className="home-v4-week-person-name"><span className="home-v3-network-avatar">{shortName(member).charAt(0).toUpperCase()}</span>{shortName(member)}</span>
                    <span>{assignedEvents} compromisso{assignedEvents === 1 ? "" : "s"} · {assignedTasks} tarefa{assignedTasks === 1 ? "" : "s"}</span>
                  </div>
                ))}
                {(unassignedWeeklyTasks > 0 || unassignedWeeklyEvents > 0) && <div className="home-v4-week-person"><span>Sem responsável definido</span><span>{unassignedWeeklyEvents} compromisso(s) do seu Google Agenda · {unassignedWeeklyTasks} tarefa(s)</span></div>}
                {!weeklyByMember.length && !unassignedWeeklyTasks && !unassignedWeeklyEvents && <p className="home-v4-week-note">Não há atividades com responsável definido nesta semana.</p>}
                <small className="home-v4-week-note">Compromissos são da sua conta Google; responsáveis vêm das marcações pessoais do calendário. Tarefas com vários responsáveis contam para cada pessoa.</small>
              </div>
              <Link className="home-v3-week-cta" to="/cuida"><ColaAsterisk size={24}/><span>Sua rotina está cheia? Peça ajuda para organizar com a Cola.</span><ChevronRight size={16}/></Link>
            </section>
          )}

          <section className="home-v3-card" aria-labelledby="home-v3-network-title">
            <div className="home-v3-card-head"><div><h2 id="home-v3-network-title">Sua rede</h2>{(network.length > 0 || invitations.length > 0) && <small>{network.length} na rede · {pendingInvitations.length} convite(s) pendente(s)</small>}</div><Link to="/rede">+ Convidar</Link></div>
            {network.length ? <div className="home-v3-network-list">{network.slice(0, 4).map((member) => <div className="home-v3-network-person" key={member.user_id}>
              <span className="home-v3-network-avatar">{shortName(member).charAt(0).toUpperCase()}</span>
              <div><strong>{shortName(member)}</strong><small>Na sua rede de cuidado</small></div>
              <span className="home-v3-network-tag">Na rede</span>
            </div>)}<Link to="/rede" className="home-v3-network-more">Ver minha rede <ArrowRight size={14}/></Link></div> : (
              <div className="home-v3-empty home-v3-network-empty"><div className="home-v3-empty-symbol is-orange" aria-hidden="true">✹</div><strong>{pendingInvitations.length ? "Convites aguardando resposta" : "Ninguém convidado ainda"}</strong><p>{pendingInvitations.length ? "Sua rede está começando. As pessoas convidadas aparecerão aqui quando aceitarem." : "Só você por enquanto. Convide alguém pra dividir o cuidado."}</p><Link className="home-v3-outlined" to="/rede"><Plus size={15}/> Convidar</Link></div>
            )}
            {isAdmin && (pendingInvitations.length > 0 || expiredInvitations.length > 0) && (
              <div className="home-v4-invitations">
                {pendingInvitations.slice(0, 3).map((invitation) => (
                  <div key={invitation.id} className="home-v4-invitation">
                    <span className="home-v3-network-avatar">{invitation.email.charAt(0).toUpperCase()}</span>
                    <div className="home-v4-invitation-body"><strong>{invitation.email}</strong><small>Enviado · expira em {new Date(invitation.expires_at).toLocaleDateString("pt-BR")}</small></div>
                    <span className="home-v4-invite-state pending">Aguardando</span>
                  </div>
                ))}
                {expiredInvitations.slice(0, 3).map((invitation) => (
                  <div key={invitation.id} className="home-v4-invitation">
                    <span className="home-v3-network-avatar">{invitation.email.charAt(0).toUpperCase()}</span>
                    <div className="home-v4-invitation-body"><strong>{invitation.email}</strong><small>Expirou em {new Date(invitation.expires_at).toLocaleDateString("pt-BR")}</small></div>
                    <span className="home-v4-invite-state expired">Expirou</span>
                  </div>
                ))}
                <Link className="home-v4-manage-invites" to="/rede">Gerenciar convites na Minha rede <ArrowRight size={14}/></Link>
                <small className="home-v4-week-note">Reenvio e cancelamento dependem das permissões e ações disponíveis na tela Minha rede.</small>
              </div>
            )}
          </section>
        </div>
      </div>

      {setup.dismissed && !setup.completed && <Link className="home-v3-reopen" to="/configurar-cola"><Settings2 size={16}/> Personalizar a Cola</Link>}
      {setup.completed && <Link className="home-v3-reopen" to="/configurar-cola"><Settings2 size={16}/> Rever configuração</Link>}


    </section>
  );
}
