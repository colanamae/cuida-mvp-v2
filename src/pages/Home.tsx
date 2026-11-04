import { Link } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Heart,
  Users,
  Sparkles,
  Wallet,
  Utensils,
  ArrowRight,
  Flower2,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useCollection } from "../hooks/useCollection";
import { Cuida, Progress } from "../components/UI";
import { first, today } from "../utils/date";
export function Home() {
  const { household, user } = useAuth(),
    id = household!.id;
  const { items: tasks } = useCollection(() => api.tasks(id), [id]);
  const { items: events } = useCollection(() => api.events(id), [id]);
  const { items: members } = useCollection(() => api.members(id), [id]);
  const { items: profiles } = useCollection(() => api.profiles(id), [id]);
  const { items: checkins } = useCollection(
    () => api.checkins(id, user!.id),
    [id, user?.id],
  );
  const { items: dreams } = useCollection(() => api.dreams(id), [id]);
  const due = tasks.filter((t) => t.due_at?.slice(0, 10) === today()),
    done = due.filter((t) => t.status === "done").length,
    missing = due.filter((t) => !t.assigned_to && t.status !== "done").length;
  const myName =
    members.find((m) => m.user_id === user?.id)?.display_name ||
    user?.email?.split("@")[0] ||
    "você";
  const todayEvents = events.filter(
    (e) => e.starts_at.slice(0, 10) === today(),
  ).length;
  const cards = [
    {
      url: "/dia",
      title: "Hoje",
      sub: `${due.length} tarefas · ${missing} sem dono`,
      icon: Check,
      theme: "pink",
      big: `${done}/${due.length}`,
      meta: "feitas",
    },
    {
      url: "/agenda",
      title: "Agenda",
      sub: `${todayEvents} compromissos hoje`,
      icon: CalendarDays,
      theme: "blue",
      big: new Date().getDate().toString(),
      meta: new Date().toLocaleDateString("pt-BR", { month: "long" }),
    },
    {
      url: "/rede",
      title: "Rede",
      sub: `${members.length} cuidam · ${profiles.length} são cuidados`,
      icon: Users,
      theme: "olive",
      big: members.map((m) => m.display_name[0]).join(" · ") || "+",
    },
    {
      url: "/eu",
      title: "Eu",
      sub: checkins[0]
        ? `Água: ${checkins[0].water}/8 · movimento: ${checkins[0].movement}min`
        : "Um momento só seu",
      icon: Heart,
      theme: "white",
      big: checkins[0]?.mood || "♡",
      meta: "só seu",
    },
    {
      url: "/conquistas",
      title: "Conquistas",
      sub: "Cada cuidado dividido importa",
      icon: Sparkles,
      theme: "peach",
      big: "✦",
    },
    {
      url: "/sonhos",
      title: "Sonhos",
      sub: `${dreams.length} sonhos em movimento`,
      icon: Sparkles,
      theme: "lilac",
      big: "✧",
    },
  ];
  return (
    <>
      <div className="eyebrow">
        {household?.name.toUpperCase()} · NOSSA EXPERIÊNCIA
      </div>
      <h1>Oi, {first(myName)}</h1>
      <p className="lead">
        Tem coisa pra dividir. Você não precisa lembrar de tudo sozinha.
      </p>
      <Cuida
        text={`${due.length} coisas hoje, ${due.filter((t) => t.assigned_to).length} com dono. Começo por onde?`}
        action={
          <Link className="button outline" to="/tarefas">
            Vamos organizar <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="home-grid">
        {cards.map((c) => (
          <Link to={c.url} className={"dashboard-card " + c.theme} key={c.url}>
            <div className="circle-icon">
              <c.icon size={23} />
            </div>
            <div className="card-bottom">
              <div className="card-big">{c.big}</div>
              {c.url === "/eu" && (
                <Progress value={checkins[0]?.water || 0} max={8} />
              )}
              <strong>{c.title}</strong>
              <small>{c.sub}</small>
            </div>
          </Link>
        ))}
      </div>
      <div className="quick-links">
        <Link to="/refeicoes">
          <Utensils size={18} /> Refeições
        </Link>
        <Link to="/financas">
          <Wallet size={18} /> Finanças
        </Link>
        <Link to="/cuida">
          <Flower2 size={18} /> Conversar com a Cuida
        </Link>
      </div>
    </>
  );
}
