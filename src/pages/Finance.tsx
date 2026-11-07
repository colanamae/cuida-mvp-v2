<<<<<<< Updated upstream
import {useState,type FormEvent} from 'react';import {Plus,Trash2,LockKeyhole} from 'lucide-react';import {useAuth} from '../contexts/AuthContext';import {api} from '../services/api';import {useCollection} from '../hooks/useCollection';import {Empty,Modal,Notice,useFeedback} from '../components/UI';import {money,today} from '../utils/date';
export function Finance(){const {household,user}=useAuth(),id=household!.id;const {items,reload}=useCollection(()=>api.transactions(id),[id]);const {items:members}=useCollection(()=>api.members(id),[id]);const {items:profiles}=useCollection(()=>api.profiles(id),[id]);const [modal,setModal]=useState(false),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[kind,setKind]=useState<'income'|'expense'>('expense'),[category,setCategory]=useState('Casa'),[visibility,setVisibility]=useState<'shared'|'private'>('private'),[due,setDue]=useState(today()),[owner,setOwner]=useState(''),[profile,setProfile]=useState('');const {error,success,run}=useFeedback();const income=items.filter(t=>t.kind==='income').reduce((s,t)=>s+Number(t.amount),0),expense=items.filter(t=>t.kind==='expense').reduce((s,t)=>s+Number(t.amount),0);const cats=Object.entries(items.filter(t=>t.kind==='expense').reduce((acc,t)=>({...acc,[t.category]:(acc[t.category]||0)+Number(t.amount)}),{} as Record<string,number>));async function save(e:FormEvent){e.preventDefault();const ok=await run(async()=>{await api.save('transactions',{household_id:id,title,amount:Number(amount),kind,category,due_date:due||null,paid:false,assigned_to:owner||null,care_profile_id:profile||null,visibility,created_by:user!.id});await reload()});if(ok)setModal(false)}return <><div className="page-head"><div><span className="eyebrow">CONTAS E COMBINADOS</span><h1>Finanças</h1><p className="lead">Valores visíveis apenas para quem tem permissão.</p></div><button className="button primary" onClick={()=>setModal(true)}><Plus size={17}/> Novo lançamento</button></div><div className="notice info"><LockKeyhole size={17}/> Lançamentos privados ficam visíveis somente para quem os criou. Compartilhados seguem os vínculos de acesso.</div><div className="stats-grid"><div className="stat"><small>Entrou</small><strong>{money(income)}</strong></div><div className="stat"><small>Saiu</small><strong>{money(expense)}</strong></div><div className="stat highlight"><small>Saldo visível</small><strong>{money(income-expense)}</strong></div></div><div className="two-columns"><div className="panel"><h2>Contas e lançamentos</h2>{items.length===0?<Empty title="Sem lançamentos"/>:<div className="list-stack compact">{items.map(t=><div className="finance-row" key={t.id}><div><strong>{t.title}</strong><small>{t.category} · {t.due_date||'Sem vencimento'} · {t.visibility==='private'?'Privado':'Compartilhado'}</small></div><strong className={t.kind==='income'?'positive':'negative'}>{t.kind==='expense'?'-':'+'}{money(Number(t.amount))}</strong><button className="icon-button danger-text" onClick={async()=>{if(confirm('Excluir lançamento?'))await run(async()=>{await api.remove('transactions',t.id);await reload()})}}><Trash2 size={16}/></button></div>)}</div>}</div><div className="panel"><h2>Pra onde foi</h2>{cats.length?cats.sort((a,b)=>b[1]-a[1]).map(([cat,value])=><div className="category-row" key={cat}><div><span>{cat}</span><strong>{money(value)}</strong></div><div className="progress"><span style={{width:`${value/(expense||1)*100}%`}}/></div></div>):<Empty title="Sem despesas registradas"/>}</div></div><Notice error={error} success={success}/>{modal&&<Modal title="Novo lançamento" onClose={()=>setModal(false)}><form className="form-stack" onSubmit={save}><label>Descrição<input required value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="two-fields"><label>Tipo<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label></div><label>Categoria<input required value={category} onChange={e=>setCategory(e.target.value)}/></label><label>Vencimento<input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label><label>Quem paga / recebe<select value={owner} onChange={e=>setOwner(e.target.value)}><option value="">Sem atribuição</option>{members.map(m=><option key={m.id} value={m.user_id}>{m.display_name}</option>)}</select></label><label>Associado a<select value={profile} onChange={e=>setProfile(e.target.value)}><option value="">Casa</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Visibilidade<select value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)}><option value="private">Só eu</option><option value="shared">Pessoas autorizadas da rede</option></select></label><Notice error={error}/><button className="button primary">Salvar</button></form></Modal>}</>}
=======
import { useState, type FormEvent } from "react";
import { Plus, Trash2, LockKeyhole } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import { Empty, Modal, Notice, useFeedback } from "../components/UI";
import { money, today } from "../utils/date";

export function Finance() {
  const { household, user } = useAuth(),
    id = household!.id;
  const { items, reload } = useCollection(() => api.transactions(id), [id]);
  const { items: members } = useCollection(() => api.members(id), [id]);
  const { items: profiles } = useCollection(() => api.profiles(id), [id]);
  const [modal, setModal] = useState(false),
    [title, setTitle] = useState(""),
    [amount, setAmount] = useState(""),
    [kind, setKind] = useState<"income" | "expense">("expense"),
    [category, setCategory] = useState("Casa"),
    [visibility, setVisibility] = useState<"shared" | "private">("private"),
    [due, setDue] = useState(today()),
    [owner, setOwner] = useState(""),
    [profile, setProfile] = useState("");
  const { error, success, run } = useFeedback();
  const income = items
      .filter((t) => t.kind === "income")
      .reduce((s, t) => s + Number(t.amount), 0),
    expense = items
      .filter((t) => t.kind === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
  const cats = Object.entries(
    items
      .filter((t) => t.kind === "expense")
      .reduce(
        (acc, t) => ({
          ...acc,
          [t.category]: (acc[t.category] || 0) + Number(t.amount),
        }),
        {} as Record<string, number>,
      ),
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await api.save("transactions", {
        household_id: id,
        title,
        amount: Number(amount),
        kind,
        category,
        due_date: due || null,
        paid: false,
        assigned_to: owner || null,
        care_profile_id: profile || null,
        visibility,
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
          <span className="eyebrow">CONTAS E COMBINADOS</span>
          <h1>Finanças</h1>
          <p className="lead">
            Valores visíveis apenas para quem tem permissão.
          </p>
        </div>
        <button className="button primary" onClick={() => setModal(true)}>
          <Plus size={17} /> Novo lançamento
        </button>
      </div>
      <div className="notice info">
        <LockKeyhole size={17} /> Lançamentos privados ficam visíveis somente
        para quem os criou. Compartilhados seguem os vínculos de acesso.
      </div>
      <div className="stats-grid">
        <div className="stat">
          <small>Entrou</small>
          <strong>{money(income)}</strong>
        </div>
        <div className="stat">
          <small>Saiu</small>
          <strong>{money(expense)}</strong>
        </div>
        <div className="stat highlight">
          <small>Saldo visível</small>
          <strong>{money(income - expense)}</strong>
        </div>
      </div>
      <div className="two-columns">
        <div className="panel">
          <h2>Contas e lançamentos</h2>
          {items.length === 0 ? (
            <Empty title="Sem lançamentos" />
          ) : (
            <div className="list-stack compact">
              {items.map((t) => (
                <div className="finance-row" key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {t.category} · {t.due_date || "Sem vencimento"} ·{" "}
                      {t.visibility === "private" ? "Privado" : "Compartilhado"}
                    </small>
                  </div>
                  <strong
                    className={t.kind === "income" ? "positive" : "negative"}
                  >
                    {t.kind === "expense" ? "-" : "+"}
                    {money(Number(t.amount))}
                  </strong>
                  <button
                    className="icon-button danger-text"
                    onClick={async () => {
                      if (confirm("Excluir lançamento?"))
                        await run(async () => {
                          await api.remove("transactions", t.id);
                          await reload();
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <h2>Pra onde foi</h2>
          {cats.length ? (
            cats
              .sort((a, b) => b[1] - a[1])
              .map(([cat, value]) => (
                <div className="category-row" key={cat}>
                  <div>
                    <span>{cat}</span>
                    <strong>{money(value)}</strong>
                  </div>
                  <div className="progress">
                    <span
                      style={{ width: `${(value / (expense || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
          ) : (
            <Empty title="Sem despesas registradas" />
          )}
        </div>
      </div>
      <Notice error={error} success={success} />
      {modal && (
        <Modal title="Novo lançamento" onClose={() => setModal(false)}>
          <form className="form-stack" onSubmit={save}>
            <label>
              Descrição
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="two-fields">
              <label>
                Tipo
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </label>
              <label>
                Valor (R$)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>
            <label>
              Categoria
              <input
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label>
              Vencimento
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <label>
              Quem paga / recebe
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Sem atribuição</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Associado a
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              >
                <option value="">Casa</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Visibilidade
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as typeof visibility)
                }
              >
                <option value="private">Só eu</option>
                <option value="shared">Pessoas autorizadas da rede</option>
              </select>
            </label>
            <Notice error={error} />
            <button className="button primary">Salvar</button>
          </form>
        </Modal>
      )}
    </>
  );
}
>>>>>>> Stashed changes
