import { useEffect, useState } from "react";
import {
  createWhatsAppLink,
  linkedWhatsApp,
  unlinkWhatsApp,
} from "../services/whatsapp";
import { useAuth } from "../contexts/AuthContext";
export function WhatsAppConnection() {
  const { household } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (household?.id)
      linkedWhatsApp(household.id)
        .then((v) => setPhone(v?.phone || null))
        .catch((e) => setError(e.message));
  }, [household?.id]);
  async function connect() {
    if (!household) return;
    setBusy(true);
    setError("");
    try {
      const result = await createWhatsAppLink(household.id);
      setCode(result.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    if (!household || !confirm("Desvincular WhatsApp da Cola?")) return;
    setBusy(true);
    try {
      await unlinkWhatsApp(household.id);
      setPhone(null);
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" aria-label="Integração WhatsApp">
      <h2>WhatsApp da Cola</h2>
      {phone ? (
        <>
          <p>Conectado ao número {phone}</p>
          <button
            className="button outline"
            disabled={busy}
            onClick={disconnect}
          >
            Desvincular
          </button>
        </>
      ) : (
        <>
          <p>
            Vincule seu número para mandar tarefas e compromissos por texto ou
            áudio. No piloto, apenas contas com acesso à casa toda podem
            vincular.
          </p>
          <button className="button primary" disabled={busy} onClick={connect}>
            Gerar código de vínculo
          </button>
          {code && (
            <div className="notice info">
              <p>No WhatsApp da Cola, envie exatamente:</p>
              <code>VINCULAR {code}</code>
              <p>O código expira em 10 minutos e só pode ser usado uma vez.</p>
              <button
                className="button outline"
                onClick={() =>
                  navigator.clipboard.writeText(`VINCULAR ${code}`)
                }
              >
                Copiar mensagem
              </button>
              <button
                className="button outline"
                onClick={async () => {
                  if (household)
                    setPhone(
                      (await linkedWhatsApp(household.id))?.phone || null,
                    );
                }}
              >
                Verificar conexão
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
