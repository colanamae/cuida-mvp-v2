import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, CircleAlert,
  CloudOff, Copy, Heart, Home, Mail, Plus, Share2, X,
  BriefcaseBusiness, Coffee, Brain, Clock3, UserRound, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import {
  type CareDraft, type InviteDraft, type SetupAnswers, type SetupRecord,
  EMPTY_ANSWERS, EMPTY_SETUP, friendlyError, getGoogleStatus,
  parseSetup, readLocalSetup, readSetup, saveCareProfiles,
  savePreferredName, saveSetup, sendOnboardingInvite, startGoogleConnect,
  updateAnswers, validateEmail,
} from "../services/colaOnboarding";
import "../styles/cola-setup.css";

const PRIORITIES = [
  { label: "Rotina dos filhos", Icon: UserRound },
  { label: "Casa e comida", Icon: Coffee },
  { label: "Trabalho e estudo", Icon: BriefcaseBusiness },
  { label: "Saúde e corpo", Icon: Heart },
  { label: "Cabeça cheia", Icon: Brain },
  { label: "Tempo pra mim", Icon: Clock3 },
];
const FAMILIES = ["Moramos juntos", "Pais em casas diferentes", "Cuido sozinha", "Tenho rede de apoio", "Outro formato"];
const RELATIONSHIPS = ["Parceira", "Parceiro", "Pai", "Mãe", "Avó ou avô", "Familiar", "Amiga ou amigo", "Outra pessoa"];
const CARE_KINDS: CareDraft["category"][] = ["Criança", "Adolescente", "Pessoa idosa", "Pet"];
const toKind = (c: CareDraft["category"]): CareDraft["kind"] => c === "Pet" ? "pet" : c === "Pessoa idosa" ? "adult" : "child";
const makeId = () => crypto.randomUUID();

function Logo() {
  return (
    <div className="cola-setup-logo" aria-label="Cola">
      <img src="/logo.png" alt="" aria-hidden="true" />
      <img src="/branding/cola-wordmark.png" alt="Cola" />
    </div>
  );
}
function Flower() { return <img src="/florzinha.png" alt="" className="cola-setup-flower" aria-hidden="true" />; }
function Alert({ text, retry, offline = false }: { text: string; retry?: () => void; offline?: boolean }) {
  return (
    <div className={`cola-setup-alert ${offline ? "offline" : ""}`} role="alert">
      {offline ? <CloudOff size={17} /> : <CircleAlert size={17} />}
      <div><strong>{offline ? "Sem conexão com a internet." : "Não deu pra concluir agora."}</strong><p>{text}</p>
        {retry && <button type="button" onClick={retry}>Tentar novamente</button>}
      </div>
    </div>
  );
}

export function ColaSetup() {
  const { user, household, refresh } = useAuth();
  const navigate = useNavigate();
  const uid = user?.id || "";
  const hid = household?.id || "";
  const [stage, setStage] = useState<"intro" | "questions" | "done">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SetupAnswers>(() => structuredClone(EMPTY_ANSWERS));
  const [record, setRecord] = useState<SetupRecord>(EMPTY_SETUP);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [careName, setCareName] = useState("");
  const [careCategory, setCareCategory] = useState<CareDraft["category"]>("Criança");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState("Parceira");
  const [inviteCareKeys, setInviteCareKeys] = useState<string[]>([]);
  const [inviteValidation, setInviteValidation] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteNotice, setInviteNotice] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [calendarChecking, setCalendarChecking] = useState(false);

  useEffect(() => {
    if (!uid || !hid) { setLoading(false); return; }
    let live = true;
    setLoading(true);
    const restore = async () => {
      const local = readLocalSetup(uid, hid);
      try {
        const [remote, membership] = await Promise.all([
          readSetup(uid, hid),
          supabase.from("household_members").select("role").eq("household_id", hid).eq("user_id", uid).maybeSingle(),
        ]);
        if (!live) return;
        const stored = remote.answers.length || remote.completed ? remote : local;
        setRecord(stored);
        const parsed = parseSetup(stored);
        try {
          const partial = JSON.parse(localStorage.getItem(`cola:setup-care:${uid}:${hid}`) || "null");
          if (Array.isArray(partial) && parsed.cared.length === partial.length &&
              partial.every((p: CareDraft, i: number) => p.key === parsed.cared[i]?.key)) parsed.cared = partial;
        } catch { /* ignore */ }
        setAnswers(parsed);
        const modernAnswers = stored.answers.filter((value) => {
          try { return JSON.parse(value)?.version === 2; } catch { return false; }
        }).length;
        setStep(Math.min(modernAnswers, 5));
        setIsAdmin(membership.data?.role === "admin");
        if (stored.completed) setStage("done");
      } catch {
        if (!live) return;
        setRecord(local); setAnswers(parseSetup(local)); setStep(Math.min(local.answers.length, 5));
        setError("Não foi possível sincronizar agora. Suas respostas salvas neste aparelho foram recuperadas.");
      } finally { if (live) setLoading(false); }
    };
    void restore();
    return () => { live = false; };
  }, [uid, hid]);

  const setAnswer = <K extends keyof SetupAnswers>(key: K, value: SetupAnswers[K]) =>
    setAnswers((previous) => ({ ...previous, [key]: value }));
  const name = answers.identity.name.trim() || String(user?.user_metadata?.preferred_name || "").trim() || "você";
  const canContinue = useMemo(() => {
    switch (step) {
      case 0: return answers.identity.name.trim().length >= 2 && answers.identity.role.length > 0;
      case 1: return answers.priorities.length > 0;
      case 2: return answers.family.length > 0;
      default: return true;
    }
  }, [answers, step]);
  const persist = useCallback(async (next: SetupRecord) => {
    if (!uid || !hid) throw new Error("Conta e família obrigatórias");
    setRecord(next);
    await saveSetup(uid, hid, next);
  }, [uid, hid]);
  async function exitSetup() {
    if (busy) return;
    setBusy(true); setError("");
    try { await persist({ ...record, dismissed: true }); navigate("/", { replace: true }); }
    catch { navigate("/", { replace: true }); }
    finally { setBusy(false); }
  }
  async function skipCurrentStep() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const nextRecord = updateAnswers(record, step, answers);
      if (step === 5) nextRecord.completed = true;
      await persist(nextRecord);
      if (step === 5) { setStage("done"); void refresh(); }
      else setStep((n) => n + 1);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  async function next() {
    if (busy || !canContinue) return;
    setBusy(true); setError("");
    try {
      let current = answers;
      if (step === 0) await savePreferredName(answers.identity.name);
      if (step === 3 && answers.cared.length > 0) {
        if (!isAdmin) throw new Error("Somente a pessoa administradora pode cadastrar pessoas cuidadas. Continue sem cadastrar ou solicite acesso à administração.");
        const updated = await saveCareProfiles(hid, uid, answers.cared, (partial) => {
          setAnswers((prev) => ({ ...prev, cared: partial }));
          try { localStorage.setItem(`cola:setup-care:${uid}:${hid}`, JSON.stringify(partial)); } catch { /* ignore */ }
        });
        current = { ...answers, cared: updated }; setAnswers(current);
      }
      const nextRecord = updateAnswers(record, step, current);
      if (step === 5) {
        nextRecord.completed = true;
        nextRecord.dismissed = false;
      }
      await persist(nextRecord);
      if (step === 5) { setStage("done"); void refresh(); }
      else setStep((v) => v + 1);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  function previous() { setError(""); setStep((s) => Math.max(0, s - 1)); }
  function addCare(e: FormEvent) {
    e.preventDefault();
    const value = careName.trim().replace(/\s+/g, " ");
    if (value.length < 2 || value.length > 100) { setError("Informe um nome entre 2 e 100 caracteres."); return; }
    if (answers.cared.some((p) => p.name.toLowerCase() === value.toLowerCase())) { setError("Esta pessoa já foi adicionada."); return; }
    setAnswer("cared", [...answers.cared, {key: makeId(), name: value, category: careCategory, kind: toKind(careCategory)}]);
    setCareName(""); setError("");
  }
  async function addInvite(e: FormEvent) {
    e.preventDefault(); setInviteValidation(""); setInviteNotice(""); setError("");
    const email = inviteEmail.trim().toLowerCase();
    if (inviteName.trim().length < 2) { setInviteValidation("Informe o nome de quem você quer convidar."); return; }
    if (!validateEmail(email)) { setInviteValidation("Confira o e-mail: parece que falta alguma coisa."); return; }
    if (email === user?.email?.toLowerCase() || answers.invited.some((i) => i.email === email)) {
      setInviteValidation("Esse e-mail já está na sua rede ou na lista de convites."); return;
    }
    if (!isAdmin) { setInviteValidation("Somente administradores podem enviar convites."); return; }
    setInviteSending(true);
    const draft: InviteDraft = { key: makeId(), name: inviteName.trim(), email,
      phone: invitePhone.trim(), relationship: inviteRelationship, careKeys: inviteCareKeys };
    try {
      const selectedCare = answers.cared.find((care) => care.key === inviteCareKeys[0]);
      if (inviteCareKeys.length && !selectedCare?.createdId) throw new Error("Cadastre a pessoa cuidada antes de vincular o convite a ela.");
      const sent = await sendOnboardingInvite(hid, draft, selectedCare?.createdId || null);
      const saved: InviteDraft = {...draft, shareUrl: sent.url, status: sent.status};
      const updated = [...answers.invited, saved];
      const nextAnswers = {...answers, invited: updated};
      setAnswers(nextAnswers);
      const nextRecord = updateAnswers(record, 4, nextAnswers);
      await persist(nextRecord);
      setInviteName(""); setInviteEmail(""); setInvitePhone(""); setInviteCareKeys([]);
      setInviteNotice(sent.status === "sent" ? "Convite enviado por e-mail!" : "Convite criado. Copie o link para compartilhar; envio automático por e-mail ainda não foi configurado.");
    } catch (e) { setInviteValidation(friendlyError(e)); }
    finally { setInviteSending(false); }
  }
  async function checkCalendar() {
    setCalendarChecking(true); setCalendarError("");
    try { const connected = await getGoogleStatus(); setGoogleConnected(connected);
      setAnswer("calendar", {google: connected});
      if (!connected) setCalendarError("O Google Agenda ainda não está conectado. Você pode conectar agora ou continuar e fazer isso depois.");
    } catch { setCalendarError("Não deu pra consultar o Google Agenda. Tente de novo ou continue para conectar depois."); }
    finally { setCalendarChecking(false); }
  }
  useEffect(() => { if (stage === "questions" && step === 5) void checkCalendar(); /* only on entry */ }, [stage, step]);
  async function connectCalendar() {
    setCalendarChecking(true); setCalendarError("");
    try {
      if (await getGoogleStatus()) { setGoogleConnected(true); setAnswer("calendar", {google:true}); return; }
      await startGoogleConnect();
    } catch { setCalendarError("Não deu pra conectar o Google Agenda. A conexão foi cancelada ou a permissão não foi dada. Tente de novo ou continue sem agenda."); }
    finally { setCalendarChecking(false); }
  }
  async function copyInvite(url: string) {
    try { await navigator.clipboard.writeText(url); setInviteNotice("Link do convite copiado!"); }
    catch { setInviteNotice("Não foi possível copiar. Abra o convite pelo módulo Minha rede."); }
  }

  if (!user || !household) return <div className="cola-setup-page"><div className="cola-setup-card"><p>Entre na sua conta e escolha uma casa para configurar a Cola.</p><Link to="/">Voltar</Link></div></div>;
  if (loading) return <div className="cola-setup-page"><div className="cola-setup-card" role="status">Carregando suas respostas...</div></div>;
  return (
    <main className="cola-setup-page">
      <section className={`cola-setup-card ${stage === "intro" || stage === "done" ? "cola-setup-card--welcome" : ""}`}>
        {stage === "intro" ? (
          <div className="cola-setup-welcome">
            <Flower />
            <h1>Oi! Bora deixar a Cola com a sua cara?</h1>
            <p>São 6 perguntas rápidas pra gente entender a sua rotina. Leva uns 2 minutos, e dá pra pular qualquer uma.</p>
            {error && <Alert text={error} offline={!navigator.onLine} />}
            <button type="button" className="cola-setup-primary" onClick={() => {setStage("questions"); setError("");}}>Começar</button>
            <button type="button" className="cola-setup-link" onClick={() => void exitSetup()} disabled={busy}>Pular por agora</button>
          </div>
        ) : stage === "done" ? (
          <div className="cola-setup-welcome">
            <Flower />
            <h1>Tudo pronto, {name}!</h1>
            <p>A Cola já está com a sua cara. Agora é só combinar o cuidado com a sua rede.</p>
            <button className="cola-setup-primary" onClick={() => navigate("/", {replace:true})}>Começar a usar a Cola</button>
            <Link className="cola-setup-secondary" to="/rede"><Share2 size={15}/> Compartilhar convite</Link>
            <button className="cola-setup-link" onClick={() => {setStage("questions"); setStep(0);}}>Revisar minhas respostas</button>
          </div>
        ) : (
          <>
            <header className="cola-setup-top">
              <button type="button" onClick={step === 0 ? () => setStage("intro") : previous}><ArrowLeft size={14}/> Voltar</button>
              <Logo />
              <button type="button" onClick={() => void skipCurrentStep()} disabled={busy}>Pular</button>
            </header>
            <div className="cola-setup-intro">
              <span>Etapa {step + 1} de 6</span>
              <h1>{[
                "Como posso te chamar?", "O que anda pesando mais?", `Como é sua família${answers.identity.name ? `, ${name}` : ""}?`,
                "Quem a gente cuida junto?", "Quem cuida com você?", "Bora juntar tudo num lugar só?",
              ][step]}</h1>
              <p>{[
                "", "Escolha quantos quiser. Assim eu sei por onde começar a ajudar.", "",
                "Crianças, adolescentes, pessoas idosas e até os pets. Dá pra mudar depois.",
                "Monte sua rede de cuidado. Cada pessoa recebe um convite por e-mail, quando o envio estiver configurado.",
                "Conecte sua agenda e eu trago os compromissos pra cá.",
              ][step]}</p>
            </div>

            {step === 0 && <div className="cola-setup-fields">
              <label>Seu nome ou apelido
                <input autoComplete="nickname" maxLength={80} value={answers.identity.name} placeholder="Ex.: Bia"
                  onChange={(e) => setAnswer("identity", {...answers.identity, name:e.target.value})}/>
              </label>
              <label>Quem você é no cuidado?
                <span className="cola-setup-select-wrap"><select value={answers.identity.role} onChange={(e) => setAnswer("identity", {...answers.identity,role:e.target.value})}>
                  <option value="">Selecione</option>{["Mãe", "Pai", "Avó ou avô", "Responsável", "Cuidadora ou cuidador", "Outra pessoa"].map((v) => <option key={v}>{v}</option>)}
                </select><ChevronDown size={15}/></span>
              </label><small>Este nome será usado na sua saudação. O papel fica salvo nas suas preferências.</small>
            </div>}

            {step === 1 && <div className="cola-setup-priorities">
              {PRIORITIES.map(({label,Icon}) => <button type="button" key={label}
                aria-pressed={answers.priorities.includes(label)} className={answers.priorities.includes(label) ? "selected" : ""}
                onClick={() => setAnswer("priorities", answers.priorities.includes(label) ? answers.priorities.filter((v) => v !== label) : [...answers.priorities,label])}>
                <Icon size={19}/><strong>{label}</strong>
              </button>)}
            </div>}

            {step === 2 && <div className="cola-setup-options">
              {FAMILIES.map((v) => <button type="button" key={v} aria-pressed={answers.family === v}
                className={answers.family === v ? "selected" : ""} onClick={() => setAnswer("family",v)}>
                <span className="cola-setup-option-circle"><Home size={15}/></span>{v}{answers.family === v && <Check size={16} className="cola-setup-option-check" />}
              </button>)}
            </div>}

            {step === 3 && <>
              <form className="cola-setup-fields" onSubmit={addCare}>
                <label>Nome <input value={careName} onChange={(e) => setCareName(e.target.value)} placeholder="Ex.: Theo" maxLength={100}/></label>
                <div className="cola-setup-pills" aria-label="Tipo de cuidado">{CARE_KINDS.map((v) => <button type="button" key={v} className={careCategory===v ? "selected" : ""} onClick={()=>setCareCategory(v)}>{v}</button>)}</div>
                <button type="submit" className="cola-setup-add" disabled={!careName.trim()}><Plus size={15}/> Adicionar</button>
              </form>
              <div className="cola-setup-chips">{answers.cared.map((v) => <div key={v.key}><span>{v.name} · {v.category}</span><button type="button" aria-label={`Remover ${v.name}`} onClick={()=>setAnswer("cared",answers.cared.filter((p)=>p.key!==v.key))} disabled={!!v.createdId}><X size={13}/></button></div>)}</div>
              {!isAdmin && <p className="cola-setup-caption">Você não é administradora desta casa. Pode continuar sem cadastrar pessoas e pedir à administração para adicioná-las depois.</p>}
            </>}

            {step === 4 && <>
              <form className="cola-setup-fields" onSubmit={(e)=>void addInvite(e)}>
                <label>Nome <input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Ex.: Rafa" maxLength={100}/></label>
                <label>E-mail <input type="email" value={inviteEmail} onChange={e=>{setInviteEmail(e.target.value);setInviteValidation("");}} placeholder="rafa@email.com"/></label>
                <label>WhatsApp (opcional) <input type="tel" value={invitePhone} onChange={e=>setInvitePhone(e.target.value)} placeholder="(79) 9 9999-9999"/></label>
                <label>Quem é dentro da rede?
                  <span className="cola-setup-select-wrap"><select value={inviteRelationship} onChange={e=>setInviteRelationship(e.target.value)}>{RELATIONSHIPS.map((v)=><option key={v}>{v}</option>)}</select><ChevronDown size={15}/></span>
                </label>
                {answers.cared.length > 0 && <div><span className="cola-setup-label">Cuida de (opcional)</span><div className="cola-setup-pills">{answers.cared.map((v)=><button type="button" key={v.key} className={inviteCareKeys.includes(v.key)?"selected":""} onClick={()=>setInviteCareKeys(inviteCareKeys.includes(v.key)?[]:[v.key])}>{v.name}</button>)}</div></div>}
                {inviteValidation && <p className="cola-setup-field-error" role="alert">{inviteValidation}</p>}
                <button type="submit" className="cola-setup-add" disabled={inviteSending}>{inviteSending?"Criando convite...":<><Plus size={15}/> Adicionar convite</>}</button>
              </form>
              {inviteNotice && <div className="cola-setup-good"><CheckCircle2 size={15}/>{inviteNotice}</div>}
              <div className="cola-setup-invites">{answers.invited.map((v)=><div className="cola-setup-invite" key={v.key}><span className="cola-setup-bubble">{v.name.charAt(0).toUpperCase()}</span><div><strong>{v.name} · {v.relationship}</strong><small>{v.email}{v.status === "sent" ? " · Enviado" : " · Link pronto"}</small></div>{v.shareUrl && <button type="button" title="Copiar link do convite" onClick={()=>void copyInvite(v.shareUrl!)}><Copy size={15}/></button>}</div>)}</div>
              <p className="cola-setup-caption">Selecione no máximo uma pessoa cuidada por convite. Sem seleção, o convite concede acesso à casa toda. O nome, WhatsApp e relação ficam nas preferências; o cadastro oficial é concluído quando a pessoa aceita.</p>
            </>}

            {step === 5 && <div className="cola-setup-calendar">
              <div className={`cola-setup-calendar-row ${googleConnected ? "connected" : ""}`}>
                <span className="cola-setup-calendar-icon"><CalendarDays size={19}/></span><strong>Google Agenda</strong>
                {googleConnected ? <span className="cola-setup-calendar-status"><Check size={13}/> Conectado</span> :
                  <button type="button" onClick={()=>void connectCalendar()} disabled={calendarChecking}>{calendarChecking?"Verificando...":"Conectar"}</button>}
              </div>
              <div className="cola-setup-calendar-row"><span className="cola-setup-calendar-icon outlook"><Mail size={18}/></span><strong>Outlook</strong><span className="cola-setup-calendar-soon">Em breve</span></div>
              <p className="cola-setup-caption"><ShieldCheck size={13}/> A Cola consulta seus compromissos e pode criar eventos quando você confirmar. A conexão utiliza o OAuth do Google.</p>
              {calendarError && <Alert text={calendarError} retry={()=>void checkCalendar()}/>}</div>}

            {error && <Alert text={error} retry={()=>void next()} offline={!navigator.onLine}/>} 
            <button type="button" className="cola-setup-primary cola-setup-continue" onClick={()=>void next()} disabled={busy || !canContinue}>
              {busy?"Salvando...":step===5?"Concluir configuração":"Continuar"}
            </button>
            <button type="button" className="cola-setup-link cola-setup-optional" onClick={() => void exitSetup()} disabled={busy}>Agora não, continuar depois</button>
          </>
        )}
      </section>
    </main>
  );
}
