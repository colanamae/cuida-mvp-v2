import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AppLayout } from "../layouts/AppLayout";
import { AuthPage } from "../pages/Auth";
import { ForgotPasswordPage } from "../pages/ForgotPassword";
import { SignupSuccess } from "../pages/SignupSuccess";
import { Onboarding } from "../pages/Onboarding";
import { Home } from "../pages/Home";
import { Tasks } from "../pages/Tasks";
import { Agenda } from "../pages/Agenda";
import { Network } from "../pages/Network";
import { Wellbeing } from "../pages/Wellbeing";
import { Achievements } from "../pages/Achievements";
import { CuidaPage } from "../pages/Cuida";
import { More } from "../pages/More";
import { Profile } from "../pages/Profile";
import { ComingSoon } from "../components/ComingSoon";

export function AppRoutes() {
  const { user, loading, household } = useAuth();
  const location = useLocation();

  if (location.pathname === "/cadastro/sucesso") {
    return <SignupSuccess />;
  }

  if (loading) {
    return <AppLayout loading />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (!household) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  if (location.pathname === "/convite") {
    return <Onboarding />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="dia" element={<Tasks dayOnly />} />
        <Route path="tarefas" element={<Tasks />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="rede" element={<Network />} />
        <Route path="eu" element={<Wellbeing />} />
        <Route path="refeicoes" element={<ComingSoon />} />
        <Route path="financas" element={<ComingSoon />} />
        <Route path="sonhos" element={<ComingSoon />} />
        <Route path="conquistas" element={<Achievements />} />
        <Route path="cuida" element={<CuidaPage />} />
        <Route path="mais" element={<More />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
