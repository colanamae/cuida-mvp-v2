<<<<<<< Updated upstream
import {useState,type FormEvent} from 'react';import {useNavigate,Link,useLocation} from 'react-router-dom';import {Flower2,ArrowRight,HeartHandshake} from 'lucide-react';import {supabase,configured} from '../services/supabase';import {Notice,useFeedback} from '../components/UI';
export function AuthPage(){const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');const {error,success,run}=useFeedback();const navigate=useNavigate();const location=useLocation();const redirect=location.search.includes("convite=")?"/convite"+location.search:"/";async function submit(e:FormEvent){e.preventDefault();const ok=await run(async()=>{const response=register?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});if(response.error)throw response.error;if(!register)navigate(redirect);},register?'Conta criada. Verifique seu e-mail caso a confirmação esteja habilitada.':'Bem-vinda!');if(ok&&!register)navigate(redirect)}
return <div className="auth-shell"><div className="auth-info"><div className="auth-logo"><Flower2/> Cola na Mãe</div><div><span className="eyebrow">NOSSA REDE, NOSSA CASA</span><h1>Cuidar é um combinado nosso.</h1><p>Uma família inteira pode colar no cuidado. Organize a rotina, compartilhe responsabilidades e encontre tempo pra você.</p><HeartHandshake size={70}/></div><small>Uma plataforma de cuidado compartilhado.</small></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><div className="mobile-brand-auth"><Flower2/> Cola na Mãe</div><span className="eyebrow">BEM-VINDA À NOSSA CASA</span><h2>{register?'Vamos começar?':'Que bom ter você aqui!'}</h2><p>{register?'Crie sua conta para cuidar em rede.':'Entre na sua conta para ver o que a família combinou.'}</p>{!configured&&<Notice error="Configure o Supabase no arquivo .env para ativar o login e os dados reais."/>}<label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><Notice error={error} success={success}/><button className="button primary" disabled={!configured}>{register?'Criar conta':'Entrar'} <ArrowRight size={18}/></button><button type="button" className="text-button" onClick={()=>setRegister(!register)}>{register?'Já tenho conta':'Ainda não tenho conta'}</button><Link className="text-button" to="/">Voltar ao início</Link></form></div></div>}
=======
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { supabase, configured } from "../services/supabase";
import { Notice, useFeedback } from "../components/UI";

const TERMS_VERSION = "2026-11-05-v1";
const PRIVACY_VERSION = "2026-11-05-v1";
const rules = [
  {
    id: "length",
    label: "Pelo menos 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "lower",
    label: "Uma letra minúscula",
    test: (value: string) => /[a-záàâãéêíóôõúüç]/.test(value),
  },
  {
    id: "upper",
    label: "Uma letra maiúscula",
    test: (value: string) => /[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(value),
  },
  {
    id: "number",
    label: "Um número",
    test: (value: string) => /\d/.test(value),
  },
];

type LegalKind = "terms" | "privacy";

function LegalDialog({
  kind,
  onClose,
}: {
  kind: LegalKind;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const terms = kind === "terms";
  return (
    <div
      className="legal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="legal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        tabIndex={-1}
      >
        <div className="legal-dialog-top">
          <h2 id="legal-title">
            {terms ? "Termos de uso" : "Aviso de privacidade"}
          </h2>
          <button
            type="button"
            className="legal-close"
            onClick={onClose}
            aria-label="Fechar documento"
          >
            <X size={20} />
          </button>
        </div>
        {terms ? (
          <div className="legal-copy">
            <p>
              <strong>Em resumo:</strong> a Cola ajuda a organizar cuidados,
              compromissos e responsabilidades. Cada pessoa deve usar a
              plataforma com respeito e compartilhar apenas informações que
              tenha autorização para registrar.
            </p>
            <h3>1. O que a plataforma oferece</h3>
            <p>
              Você pode criar uma conta, organizar sua casa, convidar pessoas
              para a rede de cuidado e registrar tarefas e informações do dia a
              dia. Alguns recursos, como integrações com mensageiros e IA,
              poderão ser disponibilizados futuramente e terão informações
              próprias quando estiverem ativos.
            </p>
            <h3>2. Sua conta e seus convites</h3>
            <p>
              Use dados verdadeiros e mantenha sua senha em segurança. Convide
              somente pessoas que devem participar do cuidado. Você é
              responsável por conferir as permissões ao compartilhar informações
              sobre outras pessoas, especialmente crianças.
            </p>
            <h3>3. Privacidade e respeito</h3>
            <p>
              Não publique dados de terceiros sem uma razão legítima e
              autorização adequada. Você deve usar a plataforma de modo
              respeitoso, sem assédio ou uso indevido de informações da rede.
            </p>
            <h3>4. Limites do serviço</h3>
            <p>
              A Cola é uma ferramenta de organização. Não substitui serviços de
              saúde, aconselhamento profissional ou atendimentos de emergência.
              Recursos e disponibilidade podem mudar conforme a evolução do
              produto.
            </p>
            <h3>5. Dúvidas e mudanças</h3>
            <p>
              Estes termos são uma versão inicial para validação do MVP.
              Mudanças relevantes deverão ser informadas às pessoas usuárias
              antes de entrarem em vigor.
            </p>
          </div>
        ) : (
          <div className="legal-copy">
            <p>
              <strong>Em resumo:</strong> seus dados são usados para criar sua
              conta e permitir que a rede de cuidado funcione. As informações
              não devem ficar visíveis para toda a rede automaticamente.
            </p>
            <h3>1. Quais dados são usados</h3>
            <p>
              No cadastro, recebemos seu nome, e-mail e credenciais de
              autenticação. Durante o uso, você poderá registrar compromissos,
              tarefas, informações da família, gastos e check-ins de bem-estar.
              Alguns dados são sensíveis e exigem cuidados extras.
            </p>
            <h3>2. Por que usamos esses dados</h3>
            <p>
              Para autenticar sua conta, manter sua organização familiar,
              permitir a colaboração autorizada e proteger o serviço. Dados de
              bem-estar devem permanecer privados para a pessoa que os
              registrou.
            </p>
            <h3>3. Quem pode acessar</h3>
            <p>
              O acesso entre pessoas da família depende dos vínculos e
              permissões configurados. A infraestrutura de autenticação e banco
              de dados utiliza o Supabase, que processa informações necessárias
              à operação do serviço. Não forneça informações de crianças a
              pessoas sem autorização.
            </p>
            <h3>4. Suas escolhas</h3>
            <p>
              Você pode solicitar acesso, correção ou exclusão de seus dados. A
              plataforma tem uma opção de exportação dos dados acessíveis à sua
              conta. Solicitações de exclusão e outros direitos precisam de um
              canal operacional de atendimento antes do lançamento público.
            </p>
            <h3>5. Segurança e conservação</h3>
            <p>
              O sistema foi projetado com autenticação e políticas de acesso,
              mas a proteção de dados depende também da configuração e dos
              testes do ambiente de produção. Os prazos de conservação e o
              contato oficial da pessoa responsável pela privacidade precisam
              ser publicados antes do lançamento.
            </p>
          </div>
        )}
        <p className="legal-version">
          Versão inicial para revisão: {terms ? TERMS_VERSION : PRIVACY_VERSION}
        </p>
        <button
          type="button"
          className="button primary legal-done"
          onClick={onClose}
        >
          Voltar ao cadastro
        </button>
      </section>
    </div>
  );
}

function ColaBrand({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={
        mobile ? "mobile-brand-auth auth-logo-cola" : "auth-logo auth-logo-cola"
      }
    >
      <div className="cola-mark" aria-hidden="true">
        <dotlottie-player
          src="/cola-animation.lottie"
          background="transparent"
          speed="1"
          autoplay
          loop
        ></dotlottie-player>
      </div>
      <span>Cola</span>
    </div>
  );
}

export function AuthPage() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [legal, setLegal] = useState<LegalKind | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { error, success, run } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = location.search.includes("convite=")
    ? "/convite" + location.search
    : "/";
  const validName = name.trim().length >= 2 && name.trim().length <= 100;
  const validPassword = rules.every((rule) => rule.test(password));
  const canRegister = validName && validPassword && accepted && !!email.trim();

  function toggleMode() {
    setRegister((previous) => !previous);
    setPassword("");
    setShowPassword(false);
    setAccepted(false);
    setSubmitted(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (register && !canRegister) return;
    const ok = await run(
      async () => {
        const response = register
          ? await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: {
                  display_name: name.trim(),
                  terms_version: TERMS_VERSION,
                  privacy_version: PRIVACY_VERSION,
                  accepted_at: new Date().toISOString(),
                },
              },
            })
          : await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
        if (response.error) throw response.error;
        if (register) {
          navigate("/cadastro/sucesso", {
            replace: true,
            state: {
              email: email.trim(),
              needsConfirmation: !response.data.session,
            },
          });
        } else {
          navigate(redirect);
        }
      },
      register ? undefined : "Bem-vinda!",
    );
    if (ok && !register) navigate(redirect);
  }

  return (
    <div className="auth-shell">
      <div className="auth-info">
        <ColaBrand />
        <div>
          <span className="eyebrow">
            UMA PLATAFORMA DE CUIDADO COMPARTILHADO
          </span>
          <h1>Cuidar é um combinado nosso.</h1>
          <p>
            Uma família inteira pode colar no cuidado. Organize a rotina,
            compartilhe responsabilidades e encontre tempo pra você.
          </p>
        </div>
        <small>A experiência da família começa com a Cola.</small>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit} noValidate={false}>
          <ColaBrand mobile />
          <div className="auth-intro">
            <span className="eyebrow">BEM-VINDA À NOSSA CASA</span>
            <h2>{register ? "Vamos começar?" : "Que bom ter você aqui!"}</h2>
            <p>
              {register
                ? "Crie sua conta para compartilhar o cuidado com quem você confia."
                : "Entre na sua conta para ver o que a família combinou."}
            </p>
          </div>
          {!configured && (
            <Notice error="Configure o Supabase no arquivo .env para ativar o login e os dados reais." />
          )}
          {register && (
            <label className="auth-field">
              Nome
              <input
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Como podemos chamar você?"
                aria-invalid={submitted && !validName}
              />
              {submitted && !validName && (
                <span className="auth-hint error">
                  Informe seu nome (de 2 a 100 caracteres).
                </span>
              )}
            </label>
          )}
          <label className="auth-field">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>
          <div className="auth-field">
            <label htmlFor="auth-password">Senha</label>
            <div className="auth-password-wrap">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 8 : 6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={register ? "Crie uma senha segura" : "Sua senha"}
                aria-describedby={register ? "password-rules" : undefined}
                aria-invalid={submitted && register && !validPassword}
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {register && (
              <div
                id="password-rules"
                className="password-rules"
                aria-label="Regras da senha"
              >
                <span className="auth-hint">Sua senha precisa ter:</span>
                <ul>
                  {rules.map((rule) => (
                    <li
                      key={rule.id}
                      className={rule.test(password) ? "passed" : ""}
                    >
                      <Check size={13} aria-hidden="true" /> {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {register && (
            <section
              className="auth-consent"
              aria-labelledby="auth-consent-title"
            >
              <h3 id="auth-consent-title">
                Antes de começar, uma combinação importante
              </h3>
              <p>
                Usamos seus dados para organizar sua conta e a rede de cuidado.
                Você decide com quem compartilhar informações da família. Dados
                pessoais e de crianças merecem atenção especial.
              </p>
              <div className="legal-links">
                <button
                  type="button"
                  className="legal-link"
                  onClick={() => setLegal("terms")}
                >
                  Ler os Termos de Uso
                </button>
                <button
                  type="button"
                  className="legal-link"
                  onClick={() => setLegal("privacy")}
                >
                  Ler o Aviso de Privacidade
                </button>
              </div>
              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  required
                />
                <span>
                  Li e concordo com os Termos de Uso e confirmo que li o Aviso
                  de Privacidade.
                </span>
              </label>
              {submitted && !accepted && (
                <span className="auth-hint error">
                  Precisamos da sua confirmação para criar a conta.
                </span>
              )}
            </section>
          )}
          <Notice error={error} success={success} />
          <button
            className="button primary auth-submit"
            disabled={!configured || (register && !canRegister)}
          >
            {register ? "Criar conta" : "Entrar"}
          </button>
          <button
            type="button"
            className="text-button auth-secondary"
            onClick={toggleMode}
          >
            {register ? "Já tenho conta" : "Ainda não tenho conta"}
          </button>
        </form>
      </div>
      {legal && <LegalDialog kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
>>>>>>> Stashed changes
