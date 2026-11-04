import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "../components/UI";
import { AppLayout } from "../layouts/AppLayout";
import { AuthPage } from "../pages/Auth";
import { Onboarding } from "../pages/Onboarding";
import { Home } from "../pages/Home";
import { Tasks } from "../pages/Tasks";
import { Agenda } from "../pages/Agenda";
import { Network } from "../pages/Network";
import { Wellbeing } from "../pages/Wellbeing";
import { Meals } from "../pages/Meals";
import { Finance } from "../pages/Finance";
import { Dreams } from "../pages/Dreams";
import { Achievements } from "../pages/Achievements";
import { CuidaPage } from "../pages/Cuida";
import { More } from "../pages/More";
export function AppRoutes() {
  const { user, loading, household } = useAuth(),
    location = useLocation();
  if (loading) return <Loading />;
  if (!user)
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  if (!household)
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  if (location.pathname === "/convite") return <Onboarding />;
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="dia" element={<Tasks dayOnly />} />
        <Route path="tarefas" element={<Tasks />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="rede" element={<Network />} />
        <Route path="eu" element={<Wellbeing />} />
        <Route path="refeicoes" element={<Meals />} />
        <Route path="financas" element={<Finance />} />
        <Route path="sonhos" element={<Dreams />} />
        <Route path="conquistas" element={<Achievements />} />
        <Route path="cuida" element={<CuidaPage />} />
        <Route path="mais" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
