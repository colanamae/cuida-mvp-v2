import { useState, type FormEvent } from "react";
import { Plus, Copy, UserRoundPlus, LockKeyhole, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Avatar, Empty, Modal, Notice, useFeedback } from "../components/UI";
import { NotificationBell } from "../components/NotificationBell";

export function Network() {
  const { household, user } = useAuth(),
    id = household!.id;
  const { items: members } = useCollection(() => api.members(id), [id]);
  const { items: profiles, reload: reloadProfiles } = useCollection(
    () => api.profiles(id),
    [id],
  );
  const [modal, setModal] = useState<"invite" | "profile" | null>(null),
    [email, setEmail] = useState(""),
    [scope, setScope] = useState<"household" | "profile">("household"),
    [which, setWhich] = useState(""),
    [name, setName] = useState(""),
    [kind, setKind] = useState<"child" | "adult" | "pet">("child"),
    [inviteLink, setInviteLink] = useState("");
  const { error, success, run } = useFeedback();
  const me = members.find((m) => m.user_id === user?.id);
  const admin = me?.role === "admin";

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      if (modal === "profile") {
        await api.save("care_profiles", {
          household_id: id,
          name: name.trim(),
          kind,
          created_by: user!.id,
        });
        await reloadProfiles();
      } else {
        const token = await api.invite({
          household_id: id,
          email: email.trim(),
          scope,
          care_profile_id: scope === "profile" ? which : null,
        });
        setInviteLink(
          `${window.location.origin}/convite?convite=${encodeURIComponent(token)}`,
        );
      }
    }, "Pronto!");
    if (ok && modal === "profile") {
      setModal(null);
      setName("");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">QUEM CUIDA E QUEM É CUIDADO</span>
          <h1>Minha rede</h1>
          <p className="lead">
            Quem cuida, quem recebe cuidado e o que cada pessoa pode acessar.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <NotificationBell />
          {admin && (
            <button
              className="button primary"
              onClick={() => {
                setInviteLink("");
                setModal("invite");
              }}
            >
              <UserRoundPlus size={18} /> Convidar
            </button>
          )}
        </div>
      </div>
      <div className="panel">
        <h2>Quem cuida</h2>
        <div className="people-grid">
          {members.map((m) => (
            <div className="person-card" key={m.id}>
              <Avatar name={m.display_name} color={m.color} size={65} />
              <strong>{m.display_name}</strong>
              <small>
                {m.role === "admin" ? "Responsável da casa" : "Rede de apoio"} ·{" "}
                {m.scope === "profile" ? "Acesso restrito" : "Casa toda"}
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="section-head">
          <h2>Quem é cuidado</h2>
          {admin && (
            <button
              className="button outline"
              onClick={() => setModal("profile")}
            >
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>
        {profiles.length === 0 ? (
          <Empty
            title="Sua rede está começando"
            description="Cadastre crianças, adultos ou pets que recebem cuidado."
          />
        ) : (
          <div className="people-grid">
            {profiles.map((p) => (
              <div className="person-card" key={p.id}>
                <Avatar
                  name={p.name}
                  color={
                    p.kind === "child"
                      ? "#C9D88F"
                      : p.kind === "pet"
                        ? "#D1C360"
                        : "#B7D9FE"
                  }
                  size={65}
                />
                <strong>{p.name}</strong>
                <small>
                  {p.kind === "child"
                    ? "Criança"
                    : p.kind === "pet"
                      ? "Pet"
                      : "Adulto"}
                </small>
                {admin && (
                  <button
                    className="text-button danger-text"
                    onClick={async () => {
                      if (confirm("Excluir esta ficha e os dados associados?"))
                        await run(async () => {
                          await api.remove("care_profiles", p.id);
                          await reloadProfiles();
                        });
                    }}
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="notice info">
        <LockKeyhole size={17} /> Pessoas da rede só podem consultar informações
        autorizadas para seu vínculo.
      </div>
      <Notice error={error} success={success} />
      {modal && (
        <Modal
          title={
            modal === "profile" ? "Nova pessoa cuidada" : "Convidar pra rede"
          }
          onClose={() => setModal(null)}
        >
          <form className="form-stack" onSubmit={save}>
            {modal === "profile" ? (
              <>
                <label>
                  Nome
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as typeof kind)}
                  >
                    <option value="child">Criança</option>
                    <option value="adult">Adulto</option>
                    <option value="pet">Pet</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  E-mail da pessoa
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Acesso
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as typeof scope)}
                  >
                    <option value="household">A casa toda</option>
                    <option value="profile">Somente uma pessoa cuidada</option>
                  </select>
                </label>
                {scope === "profile" && (
                  <label>
                    Pessoa cuidada
                    <select
                      required
                      value={which}
                      onChange={(e) => setWhich(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {profiles.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {inviteLink && (
                  <div className="share-link">
                    <p>
                      Envie este link à pessoa convidada. O convite expira em
                      sete dias e só poderá ser aceito pelo e-mail indicado.
                    </p>
                    <input readOnly value={inviteLink} />
                    <button
                      type="button"
                      className="button outline"
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                    >
                      <Copy size={16} /> Copiar link
                    </button>
                  </div>
                )}
              </>
            )}
            <Notice error={error} />
            <button className="button primary">
              {modal === "profile" ? "Salvar ficha" : "Gerar convite"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
