import { NotificationBell } from "../components/NotificationBell";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  CalendarDays,
  Users,
  Sparkles,
  Wallet,
  Utensils,
  MoreHorizontal,
  LogOut,
  ClipboardList,
  Soup,
  Star,
  Menu,
  X,
  UserRound,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { ColaAsterisk } from "../components/ColaAsterisk";
import "../styles/app-layout-brand.css";

const navigation = [
  ["/", "Início", Home],
  ["/agenda", "Compromissos", CalendarDays],
  ["/tarefas", "Tarefas", ClipboardList],
  ["/rede", "Minha rede", Users],
  ["/sonhos", "Mapa dos sonhos", Sparkles],
  ["/financas", "Finanças", Wallet],
  ["/refeicoes", "Refeições", Utensils],
] as const;

export function AppLayout({ loading = false }: { loading?: boolean }) {
  const { household, households, setHousehold } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        drawerTriggerRef.current?.focus();
      }
    };

    const onResize = () => {
      if (window.innerWidth > 720) setDrawerOpen(false);
    };

    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  if (loading) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand brand--cola-layout">
            <span className="brand-icon brand-icon--cola-layout">
              <ColaAsterisk size={42} />
            </span>
            <div className="brand-text--cola-layout">
              <strong>Cola</strong>
              <small>Cuidar é um combinado nosso.</small>
            </div>
          </div>

          <div className="side-label">Sua casa</div>

          <nav className="side-nav" aria-hidden="true">
            {navigation.map(([path, label, Icon], i) => (
              <div
                key={path}
                className={
                  "nav-item " +
                  (i === 0 ? "active " : "") +
                  (i === 5 ? "spaced" : "")
                }
              >
                <Icon size={18} />
                {label}
              </div>
            ))}
          </nav>

          <div className="side-footer">
            <div className="side-cuida-card">
              <span className="side-cuida-icon">
                <ColaAsterisk size={40} />
              </span>
              <span className="side-cuida-text">
                Cuida
                <small>Sempre por aqui</small>
              </span>
            </div>
          </div>
        </aside>

        <div className="app-right">
          <header className="topbar">
            <div className="brand mobile-brand">
              <span className="brand-icon">
                <ColaAsterisk size={21} />
              </span>
              <strong>Cola</strong>
            </div>
          </header>

          <main className="page" aria-label="Carregando conteúdo">
            <div className="home-loading">
              <div className="skeleton-line skeleton-eyebrow" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-lead" />

              <div className="skeleton-cuida">
                <div className="skeleton-circle" />
                <div className="skeleton-cuida-lines">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </div>
              </div>

              <div className="skeleton-home-grid">
                <div className="skeleton-card skeleton-today">
                  <div>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-card-subtitle" />
                  </div>
                </div>

                <div className="skeleton-card skeleton-blue">
                  <div>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-card-subtitle" />
                  </div>
                </div>

                <div className="skeleton-card skeleton-olive">
                  <div>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-card-subtitle" />
                  </div>
                </div>

                <div className="skeleton-card skeleton-white">
                  <div>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-card-subtitle" />
                  </div>
                </div>

                <div className="skeleton-card skeleton-peach">
                  <div>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-card-subtitle" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand brand--cola-layout">
          <span className="brand-icon brand-icon--cola-layout">
            <ColaAsterisk size={42} />
          </span>

          <div className="brand-text--cola-layout">
            <strong>Cola</strong>
            <small>Cuidar é um combinado nosso.</small>
          </div>
        </div>

        <nav className="side-nav">
          {navigation.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                "nav-item " + (isActive ? "active " : "")
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="side-footer">
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              "nav-item" + (isActive ? " active" : "")
            }
          >
            <UserRound size={18} /> Perfil
          </NavLink>
          <NavLink to="/cuida" className="side-cuida-card">
            <span className="side-cuida-icon">
              <ColaAsterisk size={40} />
            </span>

            <span className="side-cuida-text">
              Cuida
              <small>Sempre por aqui</small>
            </span>
          </NavLink>

          <button
            className="logout"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/entrar");
            }}
          >
            <LogOut size={17} /> Sair da conta
          </button>
        </div>
      </aside>

      <div className="app-right">
        <header className="topbar">
          <button
            ref={drawerTriggerRef}
            type="button"
            className="drawer-trigger"
            aria-label="Abrir menu de módulos"
            aria-expanded={drawerOpen}
            aria-controls="mobile-module-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={23} />
          </button>

          <div className="brand mobile-brand">
            <span className="brand-icon">
              <ColaAsterisk size={21} />
            </span>
            <strong>Cola</strong>
          </div>

          <div className="top-actions">
            {households.length > 1 && (
              <select
                aria-label="Selecionar casa"
                value={household?.id || ""}
                onChange={(e) => setHousehold(e.target.value)}
              >
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}

            <NotificationBell />
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      {drawerOpen && (
        <div className="drawer-layer">
          <button
            className="drawer-backdrop"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            type="button"
          />

          <aside
            id="mobile-module-drawer"
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de módulos"
          >
            <div className="drawer-head">
              <div className="drawer-brand">
                <span className="drawer-brand-animation">
                  <dotlottie-player
                    src="/cola-animation.lottie"
                    background="transparent"
                    speed="1"
                    autoplay
                    loop
                  ></dotlottie-player>
                </span>

                <div>
                  <strong>Cola</strong>
                  <small>Cuidar é um combinado nosso.</small>
                </div>
              </div>

              <button
                ref={drawerCloseRef}
                className="drawer-close"
                type="button"
                aria-label="Fechar menu"
                onClick={() => {
                  setDrawerOpen(false);
                  drawerTriggerRef.current?.focus();
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="drawer-content">
              <nav className="drawer-nav" aria-label="Módulos da plataforma">
                {navigation.map(([path, label, Icon]) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === "/"}
                    className={({ isActive }) =>
                      "drawer-link" + (isActive ? " active" : "")
                    }
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>

              <NavLink
                to="/perfil"
                className={({ isActive }) =>
                  "drawer-link drawer-profile-link" +
                  (isActive ? " active" : "")
                }
                onClick={() => setDrawerOpen(false)}
              >
                <UserRound size={20} />
                <span>Perfil</span>
              </NavLink>

              <NavLink
                to="/cuida"
                className="drawer-cuia-link"
                onClick={() => setDrawerOpen(false)}
              >
                <span className="drawer-cuia-icon">
                  <dotlottie-player
                    src="/cola-animation.lottie"
                    background="transparent"
                    speed="1"
                    autoplay
                    loop
                  ></dotlottie-player>
                </span>
                <span>Conversar com a Cola</span>
              </NavLink>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="drawer-logout"
                onClick={async () => {
                  setDrawerOpen(false);
                  await supabase.auth.signOut();
                  navigate("/entrar");
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
              ["/", "Início", Soup],
              ["/sonhos", "Sonhos", Star],
            ] as const
          ).map(([url, label, Icon]) => (
            <NavLink
              key={url}
              to={url}
              className={({ isActive }) =>
                "bottom-nav-item" + (isActive ? " selected" : "")
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
              "bottom-nav-center" + (isActive ? " selected" : "")
            }
          >
            <span className="bottom-nav-center-inner">
              <img src="/florzinha.png" alt="" />{" "}
            </span>
          </NavLink>

          <NavLink
            to="/financas"
            className={({ isActive }) =>
              "bottom-nav-item" + (isActive ? " selected" : "")
            }
          >
            <Wallet size={24} strokeWidth={2.2} />
            <small>Finanças</small>
          </NavLink>

          <button
            type="button"
            className="bottom-nav-item"
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
