import { useState, type FormEvent } from "react";
import { Plus, Trash2, Check, Utensils } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../../../plataforma-v5/src/services/api.ts";
import { useCollection } from "../hooks/useCollection";
import { Cuida, Empty, Modal, Notice, useFeedback } from "../components/UI";
import { today } from "../../../plataforma-v5/src/utils/date.ts";

export function Meals() {
  const { household, user } = useAuth(),
    id = household!.id;
  const { items: meals, reload: reloadMeals } = useCollection(
    () => api.meals(id),
    [id],
  );
  const { items: shopping, reload: reloadShopping } = useCollection(
    () => api.shopping(id),
    [id],
  );
  const { items: members } = useCollection(() => api.members(id), [id]);
  const [tab, setTab] = useState<"menu" | "shopping">("menu"),
    [modal, setModal] = useState(false),
    [title, setTitle] = useState(""),
    [day, setDay] = useState(today()),
    [cook, setCook] = useState(""),
    [item, setItem] = useState("");
  const { error, success, run } = useFeedback();

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await api.save("meals", {
        household_id: id,
        title,
        day,
        cook_id: cook || null,
        created_by: user!.id,
      });
      await reloadMeals();
    });
    if (ok) setModal(false);
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await api.save("shopping_items", {
        household_id: id,
        title: item,
        checked: false,
        created_by: user!.id,
      });
      await reloadShopping();
    });
    if (ok) setItem("");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">CASA · CARDÁPIO E COMPRAS</span>
          <h1>O que a gente vai comer?</h1>
          <p className="lead">
            Refeição também tem quem planeja e quem prepara.
          </p>
        </div>
        {tab === "menu" && (
          <button className="button primary" onClick={() => setModal(true)}>
            <Plus size={17} /> Adicionar dia
          </button>
        )}
      </div>
      <div className="tabs">
        <button
          className={tab === "menu" ? "selected" : ""}
          onClick={() => setTab("menu")}
        >
          Cardápio
        </button>
        <button
          className={tab === "shopping" ? "selected" : ""}
          onClick={() => setTab("shopping")}
        >
          Lista de compras
        </button>
      </div>
      <Cuida
        text={
          tab === "menu"
            ? `${meals.filter((m) => !m.cook_id).length} refeição(ões) sem cozinheiro definido. Quem pode colar nessa?`
            : "Uma lista compartilhada ajuda a não esquecer o que falta."
        }
      />
      {tab === "menu" ? (
        meals.length ? (
          <div className="meal-grid">
            {[...meals]
              .sort((a, b) => a.day.localeCompare(b.day))
              .map((m) => (
                <div className="panel meal" key={m.id}>
                  <small>
                    {new Date(m.day + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </small>
                  <h3>{m.title}</h3>
                  <div className="meal-footer">
                    <span className={"tag " + (m.cook_id ? "info" : "warning")}>
                      {m.cook_id
                        ? `Cozinha: ${members.find((u) => u.user_id === m.cook_id)?.display_name || "Alguém"}`
                        : "Sem cozinheiro"}
                    </span>
                    <button
                      className="icon-button danger-text"
                      onClick={async () => {
                        if (confirm("Remover refeição?"))
                          await run(async () => {
                            await api.remove("meals", m.id);
                            await reloadMeals();
                          });
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <Empty title="Vamos montar o cardápio?" />
        )
      ) : (
        <>
          <form className="inline-form" onSubmit={addItem}>
            <input
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Adicionar item à lista"
            />
            <button className="button primary">
              <Plus size={17} /> Adicionar
            </button>
          </form>
          {shopping.length === 0 ? (
            <Empty title="Lista de compras vazia" />
          ) : (
            <div className="list-stack">
              {shopping.map((s) => (
                <div className="task-item" key={s.id}>
                  <button
                    className={"task-check " + (s.checked ? "checked" : "")}
                    onClick={() =>
                      run(async () => {
                        await api.save(
                          "shopping_items",
                          { checked: !s.checked },
                          s.id,
                        );
                        await reloadShopping();
                      })
                    }
                  >
                    {s.checked && <Check size={16} />}
                  </button>
                  <strong className={s.checked ? "struck" : ""}>
                    {s.title}
                  </strong>
                  <button
                    className="icon-button danger-text"
                    onClick={() =>
                      run(async () => {
                        await api.remove("shopping_items", s.id);
                        await reloadShopping();
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <Notice error={error} success={success} />
      {modal && (
        <Modal title="Adicionar refeição" onClose={() => setModal(false)}>
          <form className="form-stack" onSubmit={save}>
            <label>
              O que vamos comer?
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Dia
              <input
                required
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <label>
              Quem cozinha?
              <select value={cook} onChange={(e) => setCook(e.target.value)}>
                <option value="">Ainda sem dono</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </label>
            <Notice error={error} />
            <button className="button primary">
              <Utensils size={17} /> Salvar refeição
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
