import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../../../plataforma-v5/src/services/api.ts";
import { useCollection } from "../hooks/useCollection";
import {
  Cuida,
  Empty,
  Modal,
  Notice,
  useFeedback,
  Progress,
} from "../components/UI";
import { money } from "../../../plataforma-v5/src/utils/date.ts";

export function Dreams() {
  const { household, user } = useAuth(),
    id = household!.id;
  const { items, reload } = useCollection(() => api.dreams(id), [id]);
  const [modal, setModal] = useState(false),
    [title, setTitle] = useState(""),
    [category, setCategory] = useState("Da família"),
    [target, setTarget] = useState("0"),
    [saved, setSaved] = useState("0");
  const { error, success, run } = useFeedback();

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await api.save("dreams", {
        household_id: id,
        title,
        category,
        target_amount: Number(target),
        saved_amount: Number(saved),
        created_by: user!.id,
      });
      await reload();
    });
    if (ok) setModal(false);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">O QUE A GENTE QUER VIVER JUNTO</span>
          <h1>Mapa dos sonhos</h1>
          <p className="lead">Sonho grande também se divide em passos.</p>
        </div>
        <button className="button primary" onClick={() => setModal(true)}>
          <Plus size={18} /> Novo sonho
        </button>
      </div>
      <Cuida text="Tem um sonho da família? A gente pode separar em pequenas conquistas." />
      {items.length === 0 ? (
        <Empty title="O primeiro sonho começa aqui" />
      ) : (
        <div className="dream-grid">
          {items.map((d, i) => (
            <div className={"panel dream dream-" + (i % 3)} key={d.id}>
              <div className="section-head">
                <span className="tag info">{d.category}</span>
                <button
                  className="icon-button danger-text"
                  title="Remover"
                  onClick={async () => {
                    if (confirm("Remover sonho?"))
                      await run(async () => {
                        await api.remove("dreams", d.id);
                        await reload();
                      });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <h3>{d.title}</h3>
              <p>
                {money(Number(d.saved_amount))} de{" "}
                {money(Number(d.target_amount))}
              </p>
              <Progress
                value={Number(d.saved_amount)}
                max={Number(d.target_amount) || 1}
              />
              <button
                className="button outline"
                onClick={async () => {
                  const amount = prompt(
                    "Quanto foi guardado agora? (R$)",
                    "50",
                  );
                  if (amount !== null && Number(amount) > 0)
                    await run(async () => {
                      await api.save(
                        "dreams",
                        {
                          saved_amount: Number(d.saved_amount) + Number(amount),
                        },
                        d.id,
                      );
                      await reload();
                    });
                }}
              >
                + Registrar economia
              </button>
            </div>
          ))}
        </div>
      )}
      <Notice error={error} success={success} />
      {modal && (
        <Modal title="Novo sonho" onClose={() => setModal(false)}>
          <form className="form-stack" onSubmit={save}>
            <label>
              O que queremos viver?
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              De quem é esse sonho?
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Da família</option>
                <option>Das crianças</option>
                <option>Do casal</option>
                <option>Só meu</option>
              </select>
            </label>
            <label>
              Valor alvo (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label>
              Já guardamos (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              />
            </label>
            <Notice error={error} />
            <button className="button primary">Criar sonho</button>
          </form>
        </Modal>
      )}
    </>
  );
}
