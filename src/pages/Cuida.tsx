import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  RotateCcw,
  X,
  LockKeyhole,
  // Square,
  Save,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Notice } from "../components/UI";
import { ColaAsterisk } from "../components/ColaAsterisk";
import {
  invokeCuida,
  uploadCuidaFile,
  validateAttachment,
  type Attachment,
  type Proposal,
  type Reply,
} from "../services/cuida";
import "../styles/cuida-chat.css";

const suggestions = [
  "Amanhã às 19h tem reunião da escola e preciso comprar o presente da prima",
  "Preciso pagar o boleto da escola dia 5",
  "O que tenho para organizar nesta semana?",
];
const kinds: Record<Proposal["kind"], string> = {
  commitment: "Compromisso",
  task: "Tarefa",
};
type ViewMessage = {
  id: string;
  sender: "user" | "assistant";
  content: string;
  metadata?: { attachments?: Attachment[]; proposals?: Proposal[] };
};
type Pending = { text: string; files: Attachment[] };
function humanSize(n: number) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function localDateValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function isoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function CuidaPage() {
  const { household, user } = useAuth();
  const id = household?.id || "";
  const { items: messages, reload } = useCollection(
    () => api.chat(id, user!.id),
    [id, user?.id],
  );
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [review, setReview] = useState<Proposal[]>([]);
  const [reviewSourceId, setReviewSourceId] = useState<string | null>(null);
  const { items: members } = useCollection(() => api.members(id), [id]);
  const { items: profiles } = useCollection(() => api.profiles(id), [id]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcriptHint, setTranscriptHint] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictProposalId, setConflictProposalId] = useState<string | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRecordingRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy, review.length, error]);
  useEffect(
    () => () => {
      mediaRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );
  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setShowPicker(false);
    setError("");
    try {
      validateAttachment(file);
      setUploading(true);
      setPhase("Enviando anexo...");
      const att = await uploadCuidaFile(file, user.id);
      if (file.type.startsWith("audio/")) {
        setPhase("Transcrevendo seu áudio...");
        const data = await invokeCuida<{ transcript: string }>({
          action: "transcribe",
          household_id: id,
          attachments: [att],
        });
        if (!data.transcript)
          throw new Error("Não foi possível compreender o áudio.");
        setText((prev) => [prev, data.transcript].filter(Boolean).join(" "));
        setTranscriptHint(true);
        inputRef.current?.focus();
      } else setAttachment(att);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no anexo.");
    } finally {
      setUploading(false);
      setPhase("");
    }
  }
  async function startRecording() {
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error("Seu navegador não suporta gravação de áudio.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      mediaRef.current = recorder;
      discardRecordingRef.current = false;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        if (discardRecordingRef.current) return;
        const type = recorder.mimeType.includes("mp4")
          ? "audio/mp4"
          : "audio/webm";
        const file = new File(
          chunks,
          `audio-${Date.now()}.${type === "audio/mp4" ? "m4a" : "webm"}`,
          { type },
        );
        if (!user) return;
        try {
          setUploading(true);
          setPhase("Transcrevendo seu áudio...");
          const att = await uploadCuidaFile(file, user.id);
          const data = await invokeCuida<{ transcript: string }>({
            action: "transcribe",
            household_id: id,
            attachments: [att],
          });
          if (!data.transcript)
            throw new Error(
              "Não consegui entender o áudio. Tente novamente ou digite.",
            );
          setText((prev) => [prev, data.transcript].filter(Boolean).join(" "));
          setTranscriptHint(true);
          inputRef.current?.focus();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro na transcrição.");
        } finally {
          setUploading(false);
          setPhase("");
        }
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(
        () =>
          setSeconds((s) => {
            if (s >= 119) {
              mediaRef.current?.stop();
              setRecording(false);
              if (timerRef.current) clearInterval(timerRef.current);
              return s;
            }
            return s + 1;
          }),
        1000,
      );
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError");
      setError(
        denied
          ? "O acesso ao microfone está bloqueado. Libere-o no navegador ou escreva sua mensagem."
          : err instanceof Error
            ? err.message
            : "Não foi possível iniciar a gravação.",
      );
    }
  }
  function stopRecording(discard = false) {
    discardRecordingRef.current = discard;
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    setRecording(false);
  }
  async function send(e?: FormEvent, suggestion?: string, attempt?: Pending) {
    e?.preventDefault();
    const value = (attempt?.text ?? suggestion ?? text).trim();
    const files = attempt?.files ?? (attachment ? [attachment] : []);
    if ((!value && !files.length) || busy || uploading || recording) return;
    setError("");
    setSavedNotice("");
    setBusy(true);
    setPhase(files.length ? "Lendo o anexo..." : "Organizando tudo...");
    try {
      const data = await invokeCuida<Reply>({
        action: "chat",
        household_id: id,
        message: value,
        attachments: files,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await reload();
      setReview(data.proposals || []);
      setReviewSourceId(data.assistant_message_id);
      setSelected((data.proposals || []).map((p) => p.id));
      setPending(null);
      setAttachment(null);
      setText("");
      setTranscriptHint(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não consegui responder agora.",
      );
      setPending({ text: value, files });
    } finally {
      setBusy(false);
      setPhase("");
    }
  }
  async function saveReview(allowConflict = false) {
    const list = review.filter((p) => selected.includes(p.id));
    if (!list.length || busy || !reviewSourceId) return;
    setBusy(true);
    setError("");
    setConflictWarning(null);
    setPhase("Salvando itens confirmados...");
    let saved = 0;
    let alreadySaved = 0;
    const remaining: Proposal[] = [];
    const errors: string[] = [];
    try {
      for (let index = 0; index < list.length; index++) {
        const proposal = list[index];
        try {
          const data = await invokeCuida<{
            saved: number;
            already_saved: number;
            target: string;
            target_id?: string;
          }>({
            action: "save-reviewed",
            household_id: id,
            assistant_message_id: reviewSourceId,
            items: [proposal],
            allow_conflict: allowConflict && proposal.id === conflictProposalId,
          });
          saved += data.saved;
          alreadySaved += data.already_saved;
        } catch (err) {
          const failure = err as Error & { status?: number; code?: string };
          remaining.push(proposal);
          if (failure.code === "calendar_conflict") {
            setConflictWarning(
              "Existe outro compromisso nesse horário. Revise o período ou confirme que deseja manter os dois.",
            );
            setConflictProposalId(proposal.id);
          } else {
            errors.push(`${proposal.title}: ${failure.message}`);
          }
          // Once a Google conflict appears, stop instead of trying later items invisibly.
          if (failure.code === "calendar_conflict") {
            remaining.push(...list.slice(index + 1));
            break;
          }
        }
      }
      setReview((prev) =>
        prev.filter(
          (item) =>
            !selected.includes(item.id) ||
            remaining.some((r) => r.id === item.id),
        ),
      );
      setSelected(remaining.map((item) => item.id));
      if (saved || alreadySaved) {
        setSavedNotice(
          `${saved} ${saved === 1 ? "item salvo" : "itens salvos"} em Tarefas/Compromissos.${alreadySaved ? ` ${alreadySaved} já estava salvo.` : ""}`,
        );
      }
      if (errors.length) setError(errors.join(" | "));
      if (!remaining.length && review.length === list.length)
        setReviewSourceId(null);
    } finally {
      setBusy(false);
      setPhase("");
    }
  }
  function editProposal(key: string, patch: Partial<Proposal>) {
    setConflictWarning(null);
    setConflictProposalId(null);
    setReview((items) =>
      items.map((item) => (item.id === key ? { ...item, ...patch } : item)),
    );
  }
  const records = messages as ViewMessage[];
  return (
    <section className="cuida-page" aria-label="Conversa com a Cuida">
      <div className="cuida-page-heading">
        <span className="eyebrow">ORGANIZAÇÃO DO CUIDADO</span>
        <h1>Vamos cuidar disso juntas</h1>
      </div>
      <div className="cuida-chat-panel">
        <div className="cuida-chat-scroll" ref={scrollRef} aria-live="polite">
          {records.length === 0 && !busy && (
            <div className="cuida-welcome">
              <ColaAsterisk size={72} />
              <h2>Oi! O que está na sua cabeça?</h2>
              <p>
                Pode mandar do jeito que vier: compromissos, coisas pra fazer,
                contas, ideias. Eu organizo e você só confere.
              </p>
            </div>
          )}
          {records.map((m) => (
            <div className={`cuida-chat-line ${m.sender}`} key={m.id}>
              {m.sender === "assistant" && <ColaAsterisk size={22} />}
              <div className="cuida-chat-message">
                {m.metadata?.attachments?.map((a) => (
                  <div className="cuida-inline-attachment" key={a.path}>
                    <FileText size={17} />
                    <span>{a.name}</span>
                  </div>
                ))}
                <span>{m.content}</span>
              </div>
            </div>
          ))}
          {busy && phase && (
            <div className="cuida-status">
              <ColaAsterisk size={21} />
              <span>
                <Loader2 size={14} className="cuida-spin" /> {phase}
              </span>
            </div>
          )}
          {savedNotice && (
            <div className="cuida-status">
              <ColaAsterisk size={21} />
              <span>
                {savedNotice} <Link to="/tarefas">Ver tarefas</Link> ·{" "}
                <Link to="/agenda">Ver compromissos</Link>
              </span>
            </div>
          )}
          {review.length > 0 && (
            <div className="cuida-review" aria-label="Revisar itens sugeridos">
              <p>
                Separei {review.length} {review.length === 1 ? "item" : "itens"}
                . Confira, edite e escolha quais deseja guardar.
              </p>
              {review.map((p) => (
                <div className="cuida-review-item" key={p.id}>
                  <div className="cuida-review-top">
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, p.id]
                              : prev.filter((x) => x !== p.id),
                          )
                        }
                      />
                      <span>{kinds[p.kind]}</span>
                    </label>
                    <select
                      aria-label="Tipo do item"
                      value={p.kind}
                      onChange={(e) =>
                        editProposal(p.id, {
                          kind: e.target.value as Proposal["kind"],
                        })
                      }
                    >
                      {Object.entries(kinds).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    aria-label="Título"
                    value={p.title}
                    onChange={(e) =>
                      editProposal(p.id, { title: e.target.value })
                    }
                  />
                  <textarea
                    aria-label="Descrição"
                    rows={2}
                    value={p.description || ""}
                    onChange={(e) =>
                      editProposal(p.id, { description: e.target.value })
                    }
                  />
                  {
                    <div className="cuida-review-fields">
                      <label>
                        {p.kind === "commitment"
                          ? "Início do compromisso"
                          : "Prazo da tarefa"}
                        <input
                          type="datetime-local"
                          value={localDateValue(
                            p.kind === "commitment" ? p.starts_at : p.due_at,
                          )}
                          onChange={(e) =>
                            editProposal(
                              p.id,
                              p.kind === "commitment"
                                ? { starts_at: isoFromLocal(e.target.value) }
                                : { due_at: isoFromLocal(e.target.value) },
                            )
                          }
                        />
                      </label>
                      {p.kind === "task" && (
                        <label>
                          Responsável
                          <select
                            aria-label="Responsável"
                            value={p.assigned_to || ""}
                            onChange={(e) =>
                              editProposal(p.id, {
                                assigned_to: e.target.value || null,
                              })
                            }
                          >
                            <option value="">A definir</option>
                            {members.map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.display_name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  }
                  {p.kind === "commitment" && (
                    <div className="cuida-review-fields">
                      <label>
                        Fim do compromisso
                        <input
                          type="datetime-local"
                          value={localDateValue(p.ends_at)}
                          onChange={(e) =>
                            editProposal(p.id, {
                              ends_at: isoFromLocal(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Aviso no Google
                        <select
                          value={
                            p.reminder_minutes === null
                              ? "none"
                              : String(p.reminder_minutes ?? 30)
                          }
                          onChange={(e) =>
                            editProposal(p.id, {
                              reminder_minutes:
                                e.target.value === "none"
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        >
                          <option value="none">Sem aviso</option>
                          <option value="0">Na hora</option>
                          <option value="5">5 min antes</option>
                          <option value="15">15 min antes</option>
                          <option value="30">30 min antes</option>
                          <option value="60">1 hora antes</option>
                          <option value="1440">1 dia antes</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {p.kind === "task" && (
                    <label className="cuida-care-profile">
                      Pessoa cuidada (opcional para quem tem acesso à casa toda)
                      <select
                        aria-label="Pessoa cuidada"
                        value={p.care_profile_id || ""}
                        onChange={(e) =>
                          editProposal(p.id, {
                            care_profile_id: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Toda a casa</option>
                        {profiles.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              ))}
              {conflictWarning && (
                <div className="notice error" role="alert">
                  {conflictWarning}
                  <button
                    type="button"
                    onClick={() => void saveReview(true)}
                    disabled={busy}
                  >
                    Manter os dois compromissos
                  </button>
                </div>
              )}
              <div className="cuida-review-actions">
                <button
                  type="button"
                  onClick={() => {
                    setReview([]);
                    setSelected([]);
                    setReviewSourceId(null);
                  }}
                  disabled={busy}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !selected.length}
                  onClick={() => void saveReview()}
                >
                  <Save size={16} /> Salvar {selected.length}{" "}
                  {selected.length === 1 ? "item" : "itens"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="cuida-error">
              <Notice error={error} />
              {pending && (
                <div className="cuida-error-actions">
                  <button onClick={() => setPending(null)} type="button">
                    Manter rascunho
                  </button>
                  <button
                    onClick={() => send(undefined, undefined, pending)}
                    disabled={busy}
                    type="button"
                  >
                    <RotateCcw size={14} /> Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="cuida-compose-area">
          {records.length === 0 &&
            !recording &&
            !uploading &&
            !attachment &&
            !text && (
              <div className="cuida-suggestions">
                <span>Experimente:</span>
                <div>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(undefined, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          {transcriptHint && (
            <div className="cuida-transcript-hint">
              <Check size={12} /> Transcrevi o áudio aqui embaixo. Revise e
              complete antes de enviar.
            </div>
          )}
          {attachment && (
            <div className="cuida-file-preview">
              <span className="cuida-file-icon">
                {attachment.type.startsWith("image/") ? (
                  <ImageIcon size={20} />
                ) : (
                  <FileText size={20} />
                )}
              </span>
              <div>
                <strong>{attachment.name}</strong>
                <small>{humanSize(attachment.size)} · Pronto para enviar</small>
              </div>
              <button
                type="button"
                aria-label="Remover arquivo"
                onClick={() => setAttachment(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {uploading && (
            <div className="cuida-upload-state">
              <Loader2 size={16} className="cuida-spin" /> {phase}
            </div>
          )}
          {recording ? (
            <div className="cuida-recording">
              <span className="cuida-record-dot" />{" "}
              <span className="cuida-wave">▁▃▆▂▅▇▃▆▂▁</span>
              <span>
                {Math.floor(seconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(seconds % 60).toString().padStart(2, "0")}
              </span>
              <button
                aria-label="Cancelar gravação"
                onClick={() => stopRecording(true)}
              >
                <X size={17} />
              </button>
              <button
                className="cuida-submit"
                aria-label="Finalizar e transcrever"
                onClick={() => stopRecording()}
              >
                <Check size={18} />
              </button>
            </div>
          ) : (
            <form className="cuida-composer" onSubmit={send}>
              <div className="cuida-picker-wrap">
                <button
                  type="button"
                  className="cuida-plain"
                  aria-label="Adicionar imagem ou arquivo"
                  title="Adicionar anexo"
                  onClick={() => setShowPicker(!showPicker)}
                  disabled={busy || uploading}
                >
                  <Paperclip size={19} />
                </button>
                {showPicker && (
                  <div className="cuida-picker">
                    <button
                      type="button"
                      onClick={() => {
                        fileRef.current?.setAttribute(
                          "accept",
                          "image/jpeg,image/png,image/webp,image/gif",
                        );
                        fileRef.current?.click();
                        setShowPicker(false);
                      }}
                    >
                      <ImageIcon size={18} />
                      <span>
                        Foto ou imagem
                        <small>Tire uma foto ou escolha da galeria</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fileRef.current?.setAttribute(
                          "accept",
                          ".pdf,.docx,.txt,.md,application/pdf",
                        );
                        fileRef.current?.click();
                        setShowPicker(false);
                      }}
                    >
                      <FileText size={18} />
                      <span>
                        Arquivo<small>PDF, Word ou texto · até 10 MB</small>
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" hidden onChange={pickFile} />
              <textarea
                ref={inputRef}
                aria-label="Mensagem para a Cuida"
                placeholder="Escreva ou fale..."
                value={text}
                rows={1}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={busy || uploading}
              />
              <button
                type="button"
                className="cuida-round"
                onClick={startRecording}
                aria-label="Gravar áudio"
                title="Gravar áudio"
                disabled={busy || uploading}
              >
                <Mic size={17} />
              </button>
              <button
                type="submit"
                className="cuida-submit"
                title="Enviar"
                aria-label="Enviar mensagem"
                disabled={busy || uploading || (!text.trim() && !attachment)}
              >
                {busy ? (
                  <Loader2 size={18} className="cuida-spin" />
                ) : (
                  <ArrowUp size={19} />
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="cuida-privacy">
        <LockKeyhole size={15} /> A Cuida processa mensagens e anexos usando a
        OpenAI. Revise os itens antes de salvá-los. Evite compartilhar dados
        desnecessários.
      </div>
    </section>
  );
}
