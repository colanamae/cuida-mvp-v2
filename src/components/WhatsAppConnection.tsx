import { useEffect, useState } from "react";
import {
  MessageCircle,
  ExternalLink,
  Copy,
  CheckCircle2,
  RefreshCw,
  Link2,
  AlertCircle,
} from "lucide-react";

import {
  createWhatsAppLink,
  linkedWhatsApp,
  unlinkWhatsApp,
} from "../services/whatsapp";

import { useAuth } from "../contexts/AuthContext";

// Número oficial utilizado no piloto da Cola.
const COLA_WHATSAPP_NUMBER = "15557955392";
const COLA_WHATSAPP_DISPLAY = "+1 (555) 795-5392";

const LINK_EXPIRATION_MS = 10 * 60 * 1000;

function buildWhatsAppChatUrl(code: string): string {
  const message = `VINCULAR ${code.trim()}`;

  return (
    `https://web.whatsapp.com/send` +
    `?phone=${COLA_WHATSAPP_NUMBER}` +
    `&text=${encodeURIComponent(message)}`
  );
}

export function WhatsAppConnection() {
  const { household } = useAuth();
  const householdId = household?.id;

  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Consulta a conexão ao entrar na página.
  useEffect(() => {
    let active = true;

    setPhone(null);
    setCode("");
    setExpiresAt(null);
    setError("");
    setSuccess("");
    setLoading(true);

    if (!householdId) {
      setLoading(false);
      return;
    }

    linkedWhatsApp(householdId)
      .then((result) => {
        if (!active) return;
        setPhone(result?.phone || null);
      })
      .catch((e: unknown) => {
        if (!active) return;

        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível consultar a conexão.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [householdId]);

  // Remove o código do estado após sua validade expirar.
  useEffect(() => {
    if (!code || !expiresAt) return;

    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      setCode("");
      setExpiresAt(null);
      setCopied(false);
      setError("Seu código expirou. Gere um novo código para continuar.");
      return;
    }

    const timeout = window.setTimeout(() => {
      setCode("");
      setExpiresAt(null);
      setCopied(false);
      setError("Seu código expirou. Gere um novo código para continuar.");
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [code, expiresAt]);

  async function connect() {
    if (!householdId || busy) return;

    setBusy(true);
    setError("");
    setSuccess("");
    setCopied(false);

    try {
      const result = await createWhatsAppLink(householdId);

      if (!result?.code) {
        throw new Error("Não foi possível gerar o código de vinculação.");
      }

      setCode(result.code);
      setExpiresAt(Date.now() + LINK_EXPIRATION_MS);

      setSuccess(
        "Código gerado! Agora envie a mensagem pelo WhatsApp da Cola.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gerar o código.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkConnection() {
    if (!householdId || checking) return;

    setChecking(true);
    setError("");
    setSuccess("");

    try {
      const result = await linkedWhatsApp(householdId);
      const linkedPhone = result?.phone || null;

      setPhone(linkedPhone);

      if (linkedPhone) {
        setCode("");
        setExpiresAt(null);
        setCopied(false);

        setSuccess("Prontinho! Seu WhatsApp está conectado à Cola.");
      } else {
        setSuccess(
          "Ainda não identificamos a conexão. Confira se você enviou a mensagem com o código correto.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível verificar a conexão.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function copyMessage() {
    if (!code || (expiresAt && Date.now() >= expiresAt)) {
      setError("O código expirou. Gere um novo.");
      return;
    }

    setError("");

    try {
      await navigator.clipboard.writeText(`VINCULAR ${code}`);

      setCopied(true);
      setSuccess("Mensagem copiada!");

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Selecione a mensagem para copiar.",
      );
    }
  }

  async function disconnect() {
    if (!householdId || busy) return;

    const confirmed = window.confirm(
      "Deseja desvincular seu WhatsApp da Cola?",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await unlinkWhatsApp(householdId);

      setPhone(null);
      setCode("");
      setExpiresAt(null);
      setCopied(false);

      setSuccess("Seu WhatsApp foi desvinculado com sucesso.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível desvincular o WhatsApp.",
      );
    } finally {
      setBusy(false);
    }
  }

  const codeIsValid = Boolean(code && expiresAt && Date.now() < expiresAt);

  const whatsappUrl = codeIsValid ? buildWhatsAppChatUrl(code) : "";

  return (
    <section
      className="panel whatsapp-connection"
      aria-label="Integração WhatsApp"
    >
      <div className="whatsapp-connection-header">
        <div className="whatsapp-connection-icon">
          <MessageCircle size={22} />
        </div>

        <div>
          <h2>WhatsApp da Cola</h2>
          <p>
            Converse com a Cola, organize sua rotina e receba avisos pelo
            WhatsApp.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="whatsapp-connection-loading" role="status">
          <RefreshCw size={17} className="whatsapp-spin" />
          Verificando conexão...
        </div>
      ) : phone ? (
        <div className="whatsapp-connected">
          <div className="whatsapp-connection-status">
            <CheckCircle2 size={19} />

            <div>
              <strong>WhatsApp conectado</strong>
              <span>{phone}</span>
            </div>
          </div>

          <p>
            Seu número está vinculado à Cola. Você já pode enviar mensagens e
            organizar suas atividades pelo WhatsApp.
          </p>

          <button
            type="button"
            className="button outline whatsapp-disconnect-button"
            disabled={busy}
            onClick={disconnect}
          >
            <Link2 size={17} />
            {busy ? "Desvinculando..." : "Desvincular WhatsApp"}
          </button>
        </div>
      ) : (
        <div className="whatsapp-unconnected">
          <p>
            Vincule seu WhatsApp para enviar tarefas e compromissos por texto ou
            áudio. Neste piloto, a vinculação está disponível para quem tem
            acesso à casa toda.
          </p>

          <button
            type="button"
            className="button primary whatsapp-generate-button"
            disabled={busy || !householdId}
            onClick={connect}
          >
            <Link2 size={17} />
            {busy
              ? "Gerando código..."
              : codeIsValid
                ? "Gerar novo código"
                : "Gerar código de vínculo"}
          </button>

          {codeIsValid && (
            <div className="notice info whatsapp-link-box">
              <div className="whatsapp-code-heading">
                <Link2 size={18} />
                <strong>Seu código de vinculação</strong>
              </div>

              <p>Envie a mensagem abaixo para o WhatsApp da Cola:</p>

              <code className="whatsapp-link-code">VINCULAR {code}</code>

              <p className="whatsapp-expiration-text">
                O código expira em 10 minutos e pode ser utilizado apenas uma
                vez.
              </p>

              <div className="whatsapp-link-actions">
                <div className="whatsapp-link-number">
                  <span>Enviar para o número:</span>
                  <strong>{COLA_WHATSAPP_DISPLAY}</strong>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button whatsapp-link-button"
                  aria-label={
                    "Abrir WhatsApp Web com código de vinculação preenchido"
                  }
                  onClick={(event) => {
                    if (!expiresAt || Date.now() >= expiresAt) {
                      event.preventDefault();
                      setCode("");
                      setExpiresAt(null);
                      setError("O código expirou. Gere outro para continuar.");
                    }
                  }}
                >
                  <MessageCircle size={19} />
                  Enviar código pelo WhatsApp
                  <ExternalLink size={16} />
                </a>

                <button
                  type="button"
                  className="button outline whatsapp-copy-button"
                  onClick={copyMessage}
                >
                  {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                  {copied ? "Mensagem copiada" : "Copiar mensagem"}
                </button>

                <button
                  type="button"
                  className="button outline whatsapp-check-button"
                  disabled={checking}
                  onClick={checkConnection}
                >
                  <RefreshCw
                    size={17}
                    className={checking ? "whatsapp-spin" : ""}
                  />
                  {checking ? "Verificando..." : "Verificar conexão"}
                </button>

                <small className="whatsapp-link-hint">
                  O WhatsApp Web abrirá com a mensagem preenchida. Basta clicar
                  em enviar e, depois, verificar a conexão aqui.
                </small>
              </div>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="notice success whatsapp-feedback" role="status">
          <CheckCircle2 size={17} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="notice error whatsapp-feedback" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
