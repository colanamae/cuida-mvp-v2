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
      await api.sendToCuida(id, value);
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
            <Flower2 size={22} />
            Oi! Sou a Cuida. Posso ajudar você a organizar a rotina, conversar
            sobre tarefas e compromissos e encontrar soluções para o dia a dia
            da sua família.
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
        <LockKeyhole size={17} />
        As mensagens enviadas à Cuida são processadas pela OpenAI para gerar
        respostas. A Cuida não executa ações na plataforma sem confirmação.
      </div>

      <Notice error={error} />
    </>
  );
}
