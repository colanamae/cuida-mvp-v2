import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Check,
  Utensils,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Cuida, Empty, Modal, Notice, useFeedback } from "../components/UI";
import { today } from "../utils/date";

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function getMonday(value: string) {
  const date = parseDate(value);
  const weekday = date.getDay();
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return formatDate(date);
}

function formatWeekday(value: string) {
  return parseDate(value).toLocaleDateString("pt-BR", {
    weekday: "long",
  });
}

function formatShortDate(value: string) {
  return parseDate(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function Meals() {
  const { household, user } = useAuth();
  const id = household!.id;

  const { items: meals, reload: reloadMeals } = useCollection(
    () => api.meals(id),
    [id],
  );

  const { items: shopping, reload: reloadShopping } = useCollection(
    () => api.shopping(id),
    [id],
  );

  const { items: members } = useCollection(() => api.members(id), [id]);

  const [tab, setTab] = useState<"menu" | "shopping">("menu");
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today());
  const [cook, setCook] = useState("");
  const [item, setItem] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const { error, success, run } = useFeedback();

  const currentMonday = getMonday(today());
  const weekStart = addDays(currentMonday, weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  const weekMeals = meals
    .filter((meal) => meal.day >= weekStart && meal.day <= weekEnd)
    .sort((a, b) => a.day.localeCompare(b.day));

  function openMealModal(selectedDay: string) {
    setTitle("");
    setCook("");
    setDay(selectedDay);
    setModal(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();

    const ok = await run(async () => {
      await api.save("meals", {
        household_id: id,
        title: title.trim(),
        day,
        cook_id: cook || null,
        created_by: user!.id,
      });

      await reloadMeals();
    });

    if (ok) {
      setModal(false);
      setTitle("");
      setCook("");
    }
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();

    const ok = await run(async () => {
      await api.save("shopping_items", {
        household_id: id,
        title: item.trim(),
        checked: false,
        created_by: user!.id,
      });

      await reloadShopping();
    });

    if (ok) setItem("");
  }

  const weekLabel =
    parseDate(weekStart).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
    }) +
    " – " +
    parseDate(weekEnd).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

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
          <button
            className="button primary"
            onClick={() => openMealModal(today())}
          >
            <Plus size={17} /> Adicionar refeição
          </button>
        )}
      </div>

      <div className="tabs">
        <button
          className={tab === "menu" ? "selected" : ""}
          onClick={() => setTab("menu")}
        >
          Cardápio semanal
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
            ? `${weekMeals.filter((meal) => !meal.cook_id).length} refeição(ões) desta semana sem cozinheiro definido. Quem pode colar nessa?`
            : "Uma lista compartilhada ajuda a não esquecer o que falta."
        }
      />

      {tab === "menu" ? (
        <>
          <div className="panel" style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                className="icon-button"
                aria-label="Semana anterior"
                onClick={() => setWeekOffset((value) => value - 1)}
              >
                <ChevronLeft size={20} />
              </button>

              <div style={{ textAlign: "center", flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <CalendarDays size={18} />
                  <strong>
                    {weekOffset === 0
                      ? "Esta semana"
                      : weekOffset === 1
                        ? "Próxima semana"
                        : weekOffset === -1
                          ? "Semana passada"
                          : "Planejamento semanal"}
                  </strong>
                </div>

                <small>{weekLabel}</small>
              </div>

              <button
                className="icon-button"
                aria-label="Próxima semana"
                onClick={() => setWeekOffset((value) => value + 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {weekOffset !== 0 && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button
                  className="button secondary"
                  onClick={() => setWeekOffset(0)}
                >
                  Voltar para esta semana
                </button>
              </div>
            )}
          </div>

          <div className="meal-grid">
            {weekDays.map((date) => {
              const dayMeals = weekMeals.filter((meal) => meal.day === date);

              const isToday = date === today();

              return (
                <div className="panel meal" key={date}>
                  <div className="meal-header">
                    <div>
                      <small>{formatWeekday(date)}</small>
                      <h3>{formatShortDate(date)}</h3>
                      {isToday && <span className="tag info">Hoje</span>}
                    </div>

                    <button
                      className="icon-button"
                      aria-label={`Adicionar refeição em ${date}`}
                      onClick={() => openMealModal(date)}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {dayMeals.length ? (
                    <div className="list-stack">
                      {dayMeals.map((meal) => (
                        <div key={meal.id}>
                          <strong>{meal.title}</strong>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <span
                              className={
                                "tag " + (meal.cook_id ? "info" : "warning")
                              }
                            >
                              {meal.cook_id
                                ? `Preparo: ${
                                    members.find(
                                      (member) =>
                                        member.user_id === meal.cook_id,
                                    )?.display_name || "Alguém"
                                  }`
                                : "Sem responsável"}
                            </span>

                            <button
                              className="icon-button danger-text"
                              aria-label="Remover refeição"
                              onClick={async () => {
                                if (confirm("Remover refeição?")) {
                                  await run(async () => {
                                    await api.remove("meals", meal.id);
                                    await reloadMeals();
                                  });
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ margin: "12px 0" }}>
                      Nenhuma refeição planejada.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {weekMeals.length === 0 && (
            <div style={{ marginTop: 18 }}>
              <Empty title="Sua semana ainda está sem refeições." />
            </div>
          )}
        </>
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
              {shopping.map((shoppingItem) => (
                <div className="task-item" key={shoppingItem.id}>
                  <button
                    className={
                      "task-check " + (shoppingItem.checked ? "checked" : "")
                    }
                    onClick={() =>
                      run(async () => {
                        await api.save(
                          "shopping_items",
                          { checked: !shoppingItem.checked },
                          shoppingItem.id,
                        );
                        await reloadShopping();
                      })
                    }
                  >
                    {shoppingItem.checked && <Check size={16} />}
                  </button>

                  <strong className={shoppingItem.checked ? "struck" : ""}>
                    {shoppingItem.title}
                  </strong>

                  <button
                    className="icon-button danger-text"
                    aria-label="Excluir item"
                    onClick={() =>
                      run(async () => {
                        await api.remove("shopping_items", shoppingItem.id);
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
                placeholder="Ex.: Arroz, feijão e frango"
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
                <option value="">Ainda sem responsável</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.display_name}
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
