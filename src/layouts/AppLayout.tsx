import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Home,
  Bell,
  LogOut,
  Menu,
  MoreHorizontal,
  Sparkles,
  UserRound,
  Users,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { ColaAsterisk } from "../components/ColaAsterisk";
import { useNotifications } from "../hooks/useNotifications";
import "../styles/app-layout-brand.css";

type NavEntry = {
  to: string;
  label: string;
  icon: typeof Home;
};

const routineLinks: NavEntry[] = [
  { to: "/agenda", label: "Compromissos", icon: CalendarDays },
  { to: "/tarefas", label: "Tarefas", icon: ClipboardList },
  { to: "/rede", label: "Minha rede", icon: Users },
];

const comingSoon = [
  { label: "Mapa dos sonhos", icon: Sparkles },
  { label: "Finanças", icon: Wallet },
  { label: "Refeições", icon: Utensils },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand brand--cola-layout${compact ? " brand--cola-compact" : ""}`}
    >
      <span className="brand-icon brand-icon--cola-layout" aria-hidden="true">
        <img
          src="/logo.png"
          alt=""
          className="cola-layout-brand-flower"
          draggable={false}
        />
      </span>
      <span className="brand-text--cola-layout">
        <img
          src="/branding/cola-wordmark.png"
          alt="Cola"
          className="cola-layout-brand-wordmark"
          draggable={false}
        />
      </span>
    </div>
  );
}

function AssistantLink({ onClick }: { onClick?: () => void }) {
  return (
    <NavLink
      to="/cuida"
      className={({ isActive }) =>
        `cola-assistant-link${isActive ? " is-active" : ""}`
      }
      onClick={onClick}
    >
      <span className="cola-assistant-icon" aria-hidden="true">
        <ColaAsterisk size={36} />
      </span>
      <span className="cola-assistant-copy">
        <small>ASSISTENTE COLA</small>
        <strong>Esvazie a sua mente</strong>
      </span>
    </NavLink>
  );
}

function SideNavContent({
  onNavigate,
  unread,
}: {
  onNavigate?: () => void;
  unread: number;
}) {
  return (
    <>
      <AssistantLink onClick={onNavigate} />

      <nav
        className="cola-side-navigation"
        aria-label="Navegação do aplicativo"
      >
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `nav-item cola-nav-item${isActive ? " active" : ""}`
          }
        >
          <Home size={18} aria-hidden="true" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/notificacoes"
          onClick={onNavigate}
          className={({ isActive }) =>
            `nav-item cola-nav-item cola-notifications-link${isActive ? " active" : ""}`
          }
          aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
        >
          <Bell size={18} aria-hidden="true" />
          <span>Notificações</span>
          {unread > 0 && (
            <span className="cola-nav-count">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </NavLink>

        <span className="cola-nav-heading">Rotina</span>
        {routineLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-item cola-nav-item${isActive ? " active" : ""}`
            }
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}

        <span className="cola-nav-heading">Áreas da vida</span>
        <div className="cola-nav-item cola-nav-disabled" aria-disabled="true">
          <UserRound size={18} aria-hidden="true" />
          <span>Pessoal</span>
        </div>
        <div className="cola-nav-item cola-nav-disabled" aria-disabled="true">
          <BriefcaseBusiness size={18} aria-hidden="true" />
          <span>Profissional</span>
        </div>

        <span className="cola-nav-heading">Em breve</span>
        {comingSoon.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="cola-nav-item cola-nav-disabled"
            aria-disabled="true"
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            <small className="cola-soon-badge">Em breve</small>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AppLayout({ loading = false }: { loading?: boolean }) {
  const { user, household, households, setHousehold } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const preferredName = String(
    user?.user_metadata?.preferred_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Minha conta",
  );
  const initial = preferredName.trim().charAt(0).toUpperCase() || "C";

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth > 720) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onResize);
    };
  }, [drawerOpen]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate("/entrar", { replace: true });
    else console.error("Não foi possível sair da conta:", error.message);
  }

  return (
    <div className="app-shell cola-layout-v2">
      <aside className="sidebar cola-sidebar" aria-label="Menu lateral">
        <Brand />
        <SideNavContent unread={unread} />
        <div className="side-footer cola-sidebar-footer">
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `cola-profile-tile${isActive ? " active" : ""}`
            }
          >
            <span className="cola-profile-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="cola-profile-copy">
              <strong>{preferredName}</strong>
              <small>Meu perfil</small>
            </span>
            <span className="cola-profile-chevron" aria-hidden="true">
              ›
            </span>
          </NavLink>
        </div>
      </aside>

      <div className="app-right">
        <header className="topbar cola-topbar">
          <button
            ref={triggerRef}
            className="drawer-trigger"
            type="button"
            aria-label="Abrir menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-module-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={23} />
          </button>
          <div className="mobile-brand">
            <Brand compact />
          </div>
          <div className="top-actions">
            {households.length > 1 && (
              <select
                aria-label="Selecionar casa"
                value={household?.id || ""}
                onChange={(event) => setHousehold(event.target.value)}
              >
                {households.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        <main
          className="page"
          aria-label={loading ? "Carregando conteúdo" : undefined}
          aria-busy={loading}
        >
          {loading ? (
            <div
              className="cola-loading-skeleton"
              role="status"
              aria-label="Carregando seu espaço"
            >
              <div className="cola-skeleton-line cola-skeleton-short" />
              <div className="cola-skeleton-line cola-skeleton-title" />
              <div className="cola-skeleton-assistant" />
              <div className="cola-skeleton-grid">
                <div className="cola-skeleton-card" />
                <div className="cola-skeleton-card" />
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {drawerOpen && (
        <div className="drawer-layer">
          <button
            className="drawer-backdrop"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="mobile-module-drawer"
            className="mobile-drawer cola-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu do aplicativo"
          >
            <div className="drawer-head">
              <Brand />
              <button
                ref={closeRef}
                type="button"
                className="drawer-close"
                aria-label="Fechar menu"
                onClick={() => {
                  setDrawerOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="drawer-content cola-drawer-content">
              <SideNavContent
                unread={unread}
                onNavigate={() => setDrawerOpen(false)}
              />
              <NavLink
                to="/perfil"
                className="cola-drawer-profile"
                onClick={() => setDrawerOpen(false)}
              >
                <UserRound size={18} /> Perfil
              </NavLink>
            </div>
            <div className="drawer-footer">
              <button
                type="button"
                className="drawer-logout"
                onClick={async () => {
                  setDrawerOpen(false);
                  await signOut();
                }}
              >
                <LogOut size={18} /> Sair da conta
              </button>
            </div>
          </aside>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Navegação principal no celular">
        <div className="bottom-nav-pill">
          {(
            [
              ["/", "Início", Home],
              ["/agenda", "Compromissos", CalendarDays],
            ] as const
          ).map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `bottom-nav-item${isActive ? " selected" : ""}`
              }
            >
              <Icon size={24} strokeWidth={2.2} />
              <small>{label}</small>
            </NavLink>
          ))}
          <NavLink
            to="/cuida"
            aria-label="Conversar com a Cola"
            className={({ isActive }) =>
              `bottom-nav-center cola-bottom-center${isActive ? " selected" : ""}`
            }
          >
            <span className="bottom-nav-center-inner">
              <ColaAsterisk size={48} />
            </span>
          </NavLink>
          <NavLink
            to="/tarefas"
            className={({ isActive }) =>
              `bottom-nav-item${isActive ? " selected" : ""}`
            }
          >
            <ClipboardList size={24} strokeWidth={2.2} />
            <small>Tarefas</small>
          </NavLink>
          <button
            type="button"
            className="bottom-nav-item bottom-nav-more"
            aria-label="Abrir mais módulos"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <MoreHorizontal size={24} strokeWidth={2.2} />
            <small>Mais</small>
          </button>
        </div>
      </nav>
    </div>
  );
}
