<<<<<<< Updated upstream
import {useMemo,useState,type FormEvent} from 'react';import {Plus,Check,Trash2,Pencil} from 'lucide-react';import {useAuth} from '../contexts/AuthContext';import {api} from '../services/api';import {useCollection} from '../hooks/useCollection';import {Cuida,Empty,Modal,Notice,useFeedback,Avatar} from '../components/UI';import {dateTime,isoFromLocal,localInput} from '../utils/date';import type {Task} from '../types/models';
export function Tasks({dayOnly=false}:{dayOnly?:boolean}){const {household,user}=useAuth(),id=household!.id;const {items,reload,loading}=useCollection(()=>api.tasks(id),[id]);const {items:members}=useCollection(()=>api.members(id),[id]);const {items:profiles}=useCollection(()=>api.profiles(id),[id]);const [filter,setFilter]=useState('abertas'),[editing,setEditing]=useState<Task|null>(null),[modal,setModal]=useState(false);const [title,setTitle]=useState(''),[details,setDetails]=useState(''),[due,setDue]=useState(''),[assigned,setAssigned]=useState(''),[profile,setProfile]=useState('');const {error,success,run}=useFeedback();const today=new Date().toLocaleDateString('en-CA');const filtered=useMemo(()=>items.filter(t=>(!dayOnly||t.due_at?.slice(0,10)===today)&&(filter==='todas'||filter==='abertas'&&t.status==='open'||filter==='feitas'&&t.status==='done'||filter==='sem_dono'&&!t.assigned_to&&t.status==='open'||filter==='comigo'&&t.assigned_to===user?.id)),[items,filter,dayOnly,today,user?.id]);function open(t?:Task){setEditing(t||null);setTitle(t?.title||'');setDetails(t?.details||'');setDue(localInput(t?.due_at||null));setAssigned(t?.assigned_to||'');setProfile(t?.care_profile_id||'');setModal(true)}async function save(e:FormEvent){e.preventDefault();const ok=await run(async()=>{await api.save('tasks',{household_id:id,title:title.trim(),details:details||null,due_at:isoFromLocal(due),assigned_to:assigned||null,care_profile_id:profile||null,...(!editing?{planned_by:user!.id}:{})},editing?.id);await reload()},'Tarefa salva');if(ok)setModal(false)}async function toggle(t:Task){await run(async()=>{await api.save('tasks',{status:t.status==='done'?'open':'done',completed_by:t.status==='done'?null:user!.id,completed_at:t.status==='done'?null:new Date().toISOString()},t.id);await reload()})}async function remove(t:Task){if(!confirm(`Remover "${t.title}"?`))return;await run(async()=>{await api.remove('tasks',t.id);await reload()},'Tarefa removida')};return <><div className="page-head"><div><span className="eyebrow">{dayOnly?'O QUE TEM PRA HOJE':'PENSOU → FAZ · OS DOIS CONTAM'}</span><h1>{dayOnly?'O dia da família':'Tarefas'}</h1><p className="lead">Toda tarefa tem espaço pra quem pensou e quem faz.</p></div><button className="button primary" onClick={()=>open()}><Plus size={18}/> Nova tarefa</button></div><Cuida text={`${items.filter(t=>t.status==='open'&&!t.assigned_to).length} tarefa(s) ainda sem responsável. Que tal dividir?`}/><div className="tabs">{[['abertas','Abertas'],['comigo','Comigo'],['sem_dono','Sem dono'],['feitas','Feitas'],['todas','Todas']].map(([key,label])=><button key={key} className={filter===key?'selected':''} onClick={()=>setFilter(key)}>{label}</button>)}</div><Notice error={error} success={success}/>{loading?<p>Carregando tarefas...</p>:filtered.length===0?<Empty title="Tudo em ordem por aqui" description="Crie uma tarefa ou escolha outro filtro."/>:<div className="list-stack">{filtered.map(t=>{const owner=members.find(m=>m.user_id===t.assigned_to);return <div className="task-item" key={t.id}><button aria-label={t.status==='done'?'Reabrir tarefa':'Concluir tarefa'} className={'task-check '+(t.status==='done'?'checked':'')} onClick={()=>toggle(t)}>{t.status==='done'&&<Check size={17}/>}</button><div className="task-content"><strong className={t.status==='done'?'struck':''}>{t.title}</strong><small>{dateTime(t.due_at)} · {profiles.find(p=>p.id===t.care_profile_id)?.name||'Casa'} · Pensou: {members.find(m=>m.user_id===t.planned_by)?.display_name||'Alguém da rede'}</small>{t.details&&<p>{t.details}</p>}</div>{owner?<div className="assignee"><Avatar name={owner.display_name} color={owner.color} size={32}/><small>{owner.display_name}</small></div>:<span className="tag warning">Sem dono</span>}<button className="icon-button" title="Editar" onClick={()=>open(t)}><Pencil size={17}/></button><button className="icon-button danger-text" title="Excluir" onClick={()=>remove(t)}><Trash2 size={17}/></button></div>})}</div>}{modal&&<Modal title={editing?'Editar tarefa':'Nova tarefa'} onClose={()=>setModal(false)}><form onSubmit={save} className="form-stack"><label>O que precisa ser feito?<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Detalhes<textarea value={details} onChange={e=>setDetails(e.target.value)}/></label><label>Quando?<input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label><label>Quem faz?<select value={assigned} onChange={e=>setAssigned(e.target.value)}><option value="">Ainda sem dono</option>{members.map(m=><option value={m.user_id} key={m.id}>{m.display_name}</option>)}</select></label><label>Pra quem?<select value={profile} onChange={e=>setProfile(e.target.value)}><option value="">Casa toda</option>{profiles.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><Notice error={error}/><button className="button primary">Salvar tarefa</button></form></Modal>}</>}
=======
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  ChevronLeft,
  Clock3,
  Filter,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Notice, useFeedback } from "../components/UI";
import { UnassignedTaskQueue } from "../components/UnassignedTaskQueue";
import { isoFromLocal, localInput } from "../utils/date";

import type { Member, Task, TaskAcceptance } from "../types/models";

import "../styles/tasks-redesign.css";
import "../styles/task-create-sheet.css";

type OwnerFilter = "mine" | "network" | "unassigned";
type DateFilter = "all" | "today" | "upcoming";
type TaskStatus = "open" | "in_progress" | "done";
const TASK_CATEGORIES = [
  "Saúde",
  "Escola",
  "Casa",
  "Cuidados pessoais",
] as const;
const assignedIds = (task: Task): string[] =>
  Array.isArray(task.assignees)
    ? task.assignees
    : task.assigned_to
      ? [task.assigned_to]
      : [];

function taskDate(value: string | null): string {
  if (!value) return "sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";
  const day = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(date)
    .replace(".", "");
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${day}, ${dateLabel} · ${time}`;
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function TasksCard({
  task,
  owners,
  //   author,
  acceptances,
  currentUserId,
  onAccept,
  onToggle,
  onStart,
  onReopen,
  onEdit,
  onRemove,
}: {
  task: Task;
  owners: Member[];
  author?: Member;
  acceptances: TaskAcceptance[];
  currentUserId: string;
  onAccept: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStart: (task: Task) => void;
  onReopen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onRemove: (task: Task) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const done = task.status === "done";
  const date = task.due_at ? new Date(task.due_at) : null;
  const overdue =
    !done &&
    date &&
    Number.isFinite(date.getTime()) &&
    date.getTime() < Date.now();
  const pendingOwners = owners.filter(
    (owner) =>
      !acceptances.some(
        (a) => a.task_id === task.id && a.user_id === owner.user_id,
      ),
  );
  const canAccept =
    !done &&
    owners.some((o) => o.user_id === currentUserId) &&
    pendingOwners.some((o) => o.user_id === currentUserId);
  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  return (
    <article
      className={`tasks-list-card task-compact-card${done ? " is-done" : ""}`}
    >
      <button
        type="button"
        aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
        aria-pressed={done}
        className={`tasks-list-check${done ? " checked" : ""}`}
        onClick={() => onToggle(task)}
      >
        {done && <Check size={16} strokeWidth={3} />}
      </button>
      <div className="tasks-list-body">
        <strong className="tasks-list-title">{task.title}</strong>
        <div className="task-compact-meta">
          {owners.length ? (
            owners.map((owner) => {
              const accepted = !pendingOwners.some(
                (p) => p.user_id === owner.user_id,
              );
              return (
                <span
                  className={`task-person-pill${accepted ? "" : " awaiting"}`}
                  key={owner.user_id}
                  title={`${owner.display_name}: ${accepted ? "aceitou" : "aguardando aceite"}`}
                >
                  <span
                    className="task-person-initials"
                    style={{ background: owner.color || "#FEB7B7" }}
                  >
                    {initials(owner.display_name)}
                  </span>
                  <span>{owner.display_name}</span>
                  {!accepted && (
                    <span className="task-awaiting">Aguardando</span>
                  )}
                </span>
              );
            })
          ) : (
            <span className="task-person-pill awaiting">Sem responsável</span>
          )}
          <span className="task-compact-date">{taskDate(task.due_at)}</span>
          {done ? (
            <span className="task-label-pill completed">
              <Check size={12} /> Feito
            </span>
          ) : overdue ? (
            <span className="task-label-pill overdue">Atrasada</span>
          ) : isToday(task.due_at) ? (
            <span className="task-label-pill due">
              <Clock3 size={12} /> Vence hoje
            </span>
          ) : null}
          {task.category && (
            <span className="task-label-pill category">{task.category}</span>
          )}
        </div>
        {canAccept && (
          <button
            type="button"
            className="task-accept-button"
            onClick={() => onAccept(task)}
          >
            Aceitar tarefa
          </button>
        )}
        <div className="tasks-status-actions">
          {task.status === "open" && (
            <button type="button" onClick={() => onStart(task)}>
              <Play size={13} /> Iniciar
            </button>
          )}
          {task.status === "in_progress" && (
            <button type="button" onClick={() => onReopen(task)}>
              <RotateCcw size={13} /> Voltar a fazer
            </button>
          )}
          {done && (
            <button type="button" onClick={() => onReopen(task)}>
              <RotateCcw size={13} /> Reabrir
            </button>
          )}
        </div>
      </div>
      <div className="tasks-item-actions">
        <button
          type="button"
          className="tasks-more-button"
          aria-label={`Opções de ${task.title}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreHorizontal size={20} />
        </button>
        {menuOpen && (
          <div className="tasks-actions-popover">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(task);
              }}
            >
              <Pencil size={15} /> Editar
            </button>
            <button
              type="button"
              className="danger-text"
              onClick={() => {
                setMenuOpen(false);
                onRemove(task);
              }}
            >
              <Trash2 size={15} /> Excluir
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function defaultQuickDate(day: Date): string {
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 0);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}T18:00`;
}

function quickDate(kind: "today" | "tomorrow" | "week"): string {
  const d = new Date();
  if (kind === "tomorrow") d.setDate(d.getDate() + 1);
  if (kind === "week") {
    // Choose the end of this week; never pick a day in the past.
    const daysToSunday = (7 - d.getDay()) % 7;
    d.setDate(d.getDate() + daysToSunday);
  }
  return defaultQuickDate(d);
}

function isSameLocalDay(a: string, b: string): boolean {
  return Boolean(a && b && a.slice(0, 10) === b.slice(0, 10));
}

function TaskSheet({
  editing,
  title,
  setTitle,
  details,
  setDetails,
  due,
  setDue,
  assigned,
  setAssigned,
  category,
  setCategory,
  profile,
  setProfile,
  members,
  profiles,
  currentUserId,
  error,
  busy,
  onClose,
  onSave,
}: {
  editing: Task | null;
  title: string;
  setTitle: (v: string) => void;
  details: string;
  setDetails: (v: string) => void;
  due: string;
  setDue: (v: string) => void;
  assigned: string[];
  setAssigned: (v: string[]) => void;
  category: string;
  setCategory: (v: string) => void;
  profile: string;
  setProfile: (v: string) => void;
  members: Member[];
  profiles: import("../types/models.ts").CareProfile[];
  currentUserId: string;
  error: string;
  busy: boolean;
  onClose: () => void;
  onSave: (e: FormEvent) => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  const [expanded, setExpanded] = useState(Boolean(details));
  const [customDate, setCustomDate] = useState(Boolean(editing?.due_at));
  const shortcuts = [
    { id: "today", label: "Hoje" },
    { id: "tomorrow", label: "Amanhã" },
    {
      id: "week",
      label: "Essa semana",
    },
  ] as const;
  const selectedShortcut = shortcuts.find(({ id }) =>
    isSameLocalDay(due, quickDate(id)),
  )?.id;
  const avatar = (name: string, color: string, active: boolean) => (
    <span
      className={`task-sheet-avatar${active ? " selected" : ""}`}
      style={{ backgroundColor: color }}
    >
      {name.trim()[0]?.toUpperCase() || "?"}
    </span>
  );
  return (
    <div
      className="task-sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-sheet-heading"
        className="task-sheet"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="task-sheet-grip" aria-hidden="true" />
        <div className="task-sheet-header">
          <h2 id="task-sheet-heading">
            {editing ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <button
            type="button"
            className="task-sheet-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form className="task-sheet-form" onSubmit={onSave}>
          <label className="task-sheet-title-label" htmlFor="task-title">
            O que precisa ser feito?
          </label>
          <input
            id="task-title"
            className="task-sheet-title-input"
            autoFocus
            required
            maxLength={160}
            placeholder="O que precisa ser feito?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="task-sheet-section">
            <strong>Quando</strong>
            <div className="task-sheet-chips task-sheet-dates">
              {shortcuts.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`task-sheet-chip${selectedShortcut === item.id ? " selected" : ""}`}
                  onClick={() => {
                    setDue(quickDate(item.id));
                    setCustomDate(true);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="task-sheet-date-tools">
              <button
                type="button"
                className="task-sheet-link"
                onClick={() => {
                  setCustomDate((v) => !v);
                  if (!due) setDue(defaultQuickDate(new Date()));
                }}
              >
                {customDate ? "Ocultar data e hora" : "Escolher data e hora"}
              </button>
              {due && (
                <button
                  type="button"
                  className="task-sheet-link"
                  onClick={() => {
                    setDue("");
                    setCustomDate(false);
                  }}
                >
                  Sem data
                </button>
              )}
            </div>
            {customDate && (
              <label className="task-sheet-date-label" htmlFor="task-date">
                Data e horário
                <input
                  id="task-date"
                  type="datetime-local"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
            )}
          </div>
          <div className="task-sheet-section">
            <strong>Categoria (opcional)</strong>
            <div
              className="task-sheet-chips task-sheet-categories"
              role="group"
              aria-label="Categoria da tarefa"
            >
              {TASK_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  className={`task-sheet-chip${category === item ? " selected" : ""}`}
                  onClick={() => setCategory(category === item ? "" : item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="task-sheet-people">
            <fieldset>
              <legend>
                Quem faz{" "}
                <span className="task-sheet-optional">
                  (pode escolher mais de uma pessoa)
                </span>
              </legend>
              <div className="task-sheet-avatar-row">
                {members.map((member) => (
                  <button
                    type="button"
                    key={member.id}
                    className="task-sheet-avatar-choice"
                    aria-label={`Quem faz: ${member.display_name}`}
                    aria-pressed={assigned.includes(member.user_id)}
                    title={member.display_name}
                    onClick={() =>
                      setAssigned(
                        assigned.includes(member.user_id)
                          ? assigned.filter((id) => id !== member.user_id)
                          : [...assigned, member.user_id],
                      )
                    }
                  >
                    {avatar(
                      member.display_name,
                      member.color || "#FEB7B7",
                      assigned.includes(member.user_id),
                    )}
                    <span>
                      {member.user_id === currentUserId
                        ? "Eu"
                        : member.display_name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="task-sheet-link"
                onClick={() => setAssigned([])}
              >
                {assigned.length ? "Limpar responsáveis" : "Sem responsável"}
              </button>
            </fieldset>
          </div>
          <div className="task-sheet-section">
            <strong>Pra quem</strong>
            <div className="task-sheet-chips task-sheet-profiles">
              {profiles.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={profile === item.id}
                  className={`task-sheet-chip${profile === item.id ? " selected" : ""}`}
                  onClick={() => setProfile(profile === item.id ? "" : item.id)}
                >
                  {item.name}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={!profile}
                className={`task-sheet-chip${!profile ? " selected" : ""}`}
                onClick={() => setProfile("")}
              >
                Casa
              </button>
            </div>
          </div>
          <div className="task-sheet-details">
            <button
              type="button"
              className="task-sheet-link"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Ocultar descrição" : "+ Adicionar descrição"}
            </button>
            {expanded && (
              <label htmlFor="task-details">
                Descrição (opcional)
                <textarea
                  id="task-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Alguma informação importante?"
                  maxLength={2000}
                />
              </label>
            )}
          </div>
          {error && <Notice error={error} />}
          <button
            type="submit"
            className="task-sheet-submit"
            disabled={busy || !title.trim()}
          >
            {busy
              ? "Salvando…"
              : editing
                ? "Salvar alterações"
                : "Salvar tarefa"}
          </button>
          <p className="task-sheet-note">
            A tarefa fica disponível na rede conforme as permissões. Avisos
            externos não são enviados automaticamente.
          </p>
        </form>
      </section>
    </div>
  );
}

export function Tasks() {
  const { household, user } = useAuth();
  const id = household!.id;
  const { items, reload, loading } = useCollection(() => api.tasks(id), [id]);
  const { items: members } = useCollection(() => api.members(id), [id]);
  const {
    items: acceptances,
    reload: reloadAcceptances,
    error: acceptanceError,
  } = useCollection(() => api.taskAcceptances(id), [id]);
  const { items: profiles } = useCollection(() => api.profiles(id), [id]);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("mine");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [due, setDue] = useState("");
  const [assigned, setAssigned] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const { error, success, run, setError } = useFeedback();

  // Grupos exclusivos: atribuídas à pessoa, atribuídas somente a outras pessoas, e sem responsáveis.
  // Tarefas com múltiplos responsáveis que incluem a pessoa atual ficam em "Comigo".
  const ownerGroup = (task: Task): OwnerFilter => {
    const owners = assignedIds(task);
    if (!owners.length) return "unassigned";
    return owners.includes(user?.id || "") ? "mine" : "network";
  };
  const counts = useMemo(
    () => ({
      mine: items.filter((t) => ownerGroup(t) === "mine").length,
      network: items.filter((t) => ownerGroup(t) === "network").length,
      unassigned: items.filter((t) => ownerGroup(t) === "unassigned").length,
    }),
    [items, user?.id],
  );
  const filtered = useMemo(
    () =>
      items
        .filter((task) => {
          if (ownerGroup(task) !== ownerFilter) return false;
          if (dateFilter !== "all") {
            if (!task.due_at) return false;
            const due = new Date(task.due_at);
            if (Number.isNaN(due.getTime())) return false;
            const now = new Date();
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const horizon = new Date(today);
            horizon.setDate(today.getDate() + 8);
            if (dateFilter === "today" && (due < today || due >= tomorrow))
              return false;
            if (dateFilter === "upcoming" && (due < tomorrow || due >= horizon))
              return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (a.status === "done" && b.status !== "done") return 1;
          if (b.status === "done" && a.status !== "done") return -1;
          return (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999");
        }),
    [items, ownerFilter, dateFilter, user?.id],
  );
  const activeFilters = Number(dateFilter !== "all");
  const TABS: { value: OwnerFilter; label: string }[] = [
    { value: "mine", label: "Comigo" },
    { value: "network", label: "Rede" },
    { value: "unassigned", label: "Sem responsável" },
  ];

  function open(task?: Task) {
    setError("");
    setEditing(task || null);
    setTitle(task?.title || "");
    setDetails(task?.details || "");
    setDue(localInput(task?.due_at || null));
    setAssigned(task ? assignedIds(task) : []);
    setCategory(task?.category || "");
    setProfile(task?.care_profile_id || "");
    setModal(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await run(
      async () => {
        await api.save(
          "tasks",
          {
            household_id: id,
            title: title.trim(),
            details: details.trim() || null,
            due_at: isoFromLocal(due),
            assignees: assigned,
            category: category || null,
            care_profile_id: profile || null,
            ...(!editing ? { planned_by: user!.id } : {}),
          },
          editing?.id,
        );
        await reload();
      },
      editing ? "Alterações salvas" : "Tarefa criada",
    );
    setBusy(false);
    if (ok) {
      setModal(false);
      setOwnerFilter(
        assigned.includes(user!.id)
          ? "mine"
          : assigned.length
            ? "network"
            : "unassigned",
      );
      setDateFilter("all");
    }
  }

  async function assignUnowned(
    task: Task,
    userIds: string[],
  ): Promise<boolean> {
    if (!userIds.length || busy || assignedIds(task).length) return false;
    setBusy(true);
    const ok = await run(async () => {
      // A atribuição é feita no Supabase; os aceites permanecem pendentes até a confirmação individual.
      await api.save("tasks", { assignees: userIds }, task.id);
      await reload();
      await reloadAcceptances();
    }, "Tarefa distribuída. Aguardando aceite das pessoas responsáveis.");
    setBusy(false);
    return Boolean(ok);
  }

  async function acceptTask(task: Task) {
    await run(async () => {
      await api.acceptTask(id, task.id, user!.id);
      await reloadAcceptances();
    }, "Tarefa aceita!");
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    await run(
      async () => {
        await api.save(
          "tasks",
          {
            status,
            completed_by: status === "done" ? user!.id : null,
            completed_at: status === "done" ? new Date().toISOString() : null,
          },
          task.id,
        );
        await reload();
      },
      status === "done"
        ? "Tarefa concluída"
        : status === "in_progress"
          ? "Tarefa em andamento"
          : "Tarefa movida para A fazer",
    );
  }

  async function remove(task: Task) {
    if (!window.confirm(`Remover "${task.title}"?`)) return;
    await run(async () => {
      await api.remove("tasks", task.id);
      await reload();
    }, "Tarefa removida");
  }

  return (
    <div className="tasks-redesign-page">
      <div className="tasks-redesign-heading">
        <div className="tasks-heading-left">
          <Link to="/" className="tasks-back" aria-label="Voltar ao início">
            <ChevronLeft size={27} />
          </Link>
          <h1>Tarefas</h1>
        </div>
        <button
          type="button"
          className="button primary tasks-create-button"
          onClick={() => open()}
        >
          <Plus size={19} />
          <span>Nova tarefa</span>
        </button>
      </div>

      <div
        className="tasks-redesign-tabs tasks-owner-tabs"
        role="tablist"
        aria-label="Tarefas por responsável"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={ownerFilter === tab.value}
            className={ownerFilter === tab.value ? "active" : ""}
            onClick={() => setOwnerFilter(tab.value)}
          >
            <span>{tab.label}</span>
            <small>{counts[tab.value]}</small>
          </button>
        ))}
      </div>

      <div className="tasks-filter-bar">
        <button
          type="button"
          className={`tasks-filter-trigger${activeFilters ? " has-active" : ""}`}
          aria-expanded={filterOpen}
          aria-controls="task-filter-panel"
          onClick={() => setFilterOpen((v) => !v)}
        >
          <Filter size={17} /> Filtrar por prazo{" "}
          {activeFilters > 0 && (
            <span className="tasks-filter-count">{activeFilters}</span>
          )}
        </button>
        {activeFilters > 0 && (
          <button
            type="button"
            className="tasks-filter-clear"
            onClick={() => setDateFilter("all")}
          >
            Limpar prazo
          </button>
        )}
        {filterOpen && (
          <div
            id="task-filter-panel"
            className="tasks-filter-panel tasks-date-only-panel"
            aria-label="Filtros de prazo"
          >
            <fieldset>
              <legend>Prazo</legend>
              {(
                [
                  { value: "all", label: "Qualquer data" },
                  { value: "today", label: "Hoje" },
                  {
                    value: "upcoming",
                    label: "Próximos dias",
                  },
                ] as const
              ).map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="tasks-date-filter"
                    checked={dateFilter === option.value}
                    onChange={() => setDateFilter(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              className="button primary tasks-filter-apply"
              onClick={() => setFilterOpen(false)}
            >
              Ver tarefas
            </button>
          </div>
        )}
      </div>

      <Notice
        error={!modal ? error || acceptanceError : undefined}
        success={success}
      />
      {loading ? (
        <p className="tasks-loading">Carregando tarefas…</p>
      ) : ownerFilter === "unassigned" ? (
        <UnassignedTaskQueue
          tasks={filtered}
          members={members}
          busy={busy}
          totalUnassigned={counts.unassigned}
          onAssign={assignUnowned}
        />
      ) : filtered.length === 0 ? (
        <p className="tasks-group-empty">
          Nenhuma tarefa neste grupo com o prazo selecionado.
        </p>
      ) : (
        <div className="tasks-redesign-list">
          {filtered.map((task) => (
            <TasksCard
              key={task.id}
              task={task}
              owners={assignedIds(task)
                .map((uid) => members.find((m) => m.user_id === uid))
                .filter((m): m is Member => Boolean(m))}
              author={members.find((m) => m.user_id === task.planned_by)}
              acceptances={acceptances}
              currentUserId={user!.id}
              onAccept={acceptTask}
              onToggle={(t) =>
                changeStatus(t, t.status === "done" ? "open" : "done")
              }
              onStart={(t) => changeStatus(t, "in_progress")}
              onReopen={(t) => changeStatus(t, "open")}
              onEdit={open}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {modal && (
        <TaskSheet
          editing={editing}
          title={title}
          setTitle={setTitle}
          details={details}
          setDetails={setDetails}
          due={due}
          setDue={setDue}
          assigned={assigned}
          setAssigned={setAssigned}
          category={category}
          setCategory={setCategory}
          profile={profile}
          setProfile={setProfile}
          members={members}
          profiles={profiles}
          currentUserId={user!.id}
          error={error}
          busy={busy}
          onClose={() => setModal(false)}
          onSave={save}
        />
      )}
    </div>
  );
}
>>>>>>> Stashed changes
