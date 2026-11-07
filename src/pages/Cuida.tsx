import { useState, type FormEvent } from "react";
import { Flower2, Send, LockKeyhole } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Notice, useFeedback } from "../components/UI";

const suggestions = [
  "O que está sem dono?",
  "Minhas tarefas abertas",
  "O que tem na agenda?",
];

export function CuidaPage() {
  const { household, user } = useAuth(),
    id = household!.id;
  const { items: messages, reload } = useCollection(
    () => api.chat(id, user!.id),
    [id, user?.id],
  );
  const [text, setText] = useState("");
  const { error, run } = useFeedback();

  async function submit(e?: FormEvent, preset?: string) {
    e?.preventDefault();
    const value = (preset || text).trim();
    if (!value) return;
    const ok = await run(async () => {
      await api.save("chat_messages", {
        household_id: id,
        user_id: user!.id,
        sender: "user",
        content: value,
      });
      const [tasks, events] = await Promise.all([
        api.tasks(id),
        api.events(id),
      ]);
      const lower = value.toLowerCase();
      let reply =
        "Tô aqui pra organizar com você. Posso ajudar a consultar tarefas e compromissos. Para novas ações, use as telas da plataforma.";
      if (lower.includes("sem dono")) {
        const open = tasks.filter(
          (t) => t.status === "open" && !(t.assignees?.length || t.assigned_to),
        );
        reply = open.length
          ? `Estas tarefas ainda estão sem dono: ${open
              .slice(0, 6)
              .map((t) => t.title)
              .join("; ")}. Você pode distribuir na tela de Tarefas.`
          : "Todas as tarefas abertas já têm responsável!";
      } else if (lower.includes("tarefa")) {
        const mine = tasks.filter(
          (t) =>
            t.status === "open" &&
            (t.assignees?.length
              ? t.assignees.includes(user!.id)
              : t.assigned_to === user!.id),
        );
        reply = mine.length
          ? `Com você: ${mine
              .slice(0, 6)
              .map((t) => t.title)
              .join("; ")}.`
          : "Não encontrei tarefas abertas atribuídas a você.";
      } else if (lower.includes("agenda") || lower.includes("compromisso")) {
        const upcoming = events
          .filter((e) => new Date(e.starts_at) >= new Date())
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
          .slice(0, 5);
        reply = upcoming.length
          ? `Próximos compromissos: ${upcoming.map((e) => `${e.title} (${new Date(e.starts_at).toLocaleString("pt-BR")})`).join("; ")}.`
          : "Não encontrei compromissos futuros.";
      }
      await api.save("chat_messages", {
        household_id: id,
        user_id: user!.id,
        sender: "assistant",
        content: reply,
        metadata: { engine: "local-rules-v1" },
      });
      await reload();
    });
    if (ok) setText("");
  }

  return (
    <>
      <span className="eyebrow">SUA ASSISTENTE DE CUIDADO</span>
      <h1>Cuida</h1>
      <p className="lead">
        Sempre por aqui, pra ajudar a organizar a nossa rede.
      </p>
      <div className="chat-panel">
        <div className="chat-messages">
          <div className="chat-bubble assistant">
            <Flower2 size={22} /> Oi! Sou a Cuida. Posso consultar suas tarefas
            e agenda. Ainda não sou uma IA generativa: esta versão usa respostas
            baseadas em regras.
          </div>
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                "chat-bubble " +
                (m.sender === "assistant" ? "assistant" : "user")
              }
            >
              {m.sender === "assistant" && <Flower2 size={18} />}
              <span>{m.content}</span>
            </div>
          ))}
        </div>
        <div className="suggestions">
          {suggestions.map((s) => (
            <button
              className="pill"
              key={s}
              onClick={() => submit(undefined, s)}
            >
              {s}
            </button>
          ))}
        </div>
        <form className="chat-input" onSubmit={(e) => submit(e)}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Conta pra mim o que você precisa..."
            aria-label="Mensagem para a Cuida"
          />
          <button className="button primary" title="Enviar">
            <Send size={18} />
          </button>
        </form>
      </div>
      <div className="notice info">
        <LockKeyhole size={17} /> Nenhuma mensagem é enviada a terceiros. Ações
        na rede exigirão confirmação explícita quando a integração com IA
        estiver disponível.
      </div>
      <Notice error={error} />
    </>
  );
}
