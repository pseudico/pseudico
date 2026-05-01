import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./shell/ErrorBoundary";
import { AppShell } from "./shell/AppShell";
import { CollectionsPage } from "./pages/CollectionsPage";
import { ContactsPage } from "./pages/ContactsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InboxPage } from "./pages/InboxPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TagsCategoriesPage } from "./pages/TagsCategoriesPage";
import { TodayPage } from "./pages/TodayPage";
import { WelcomePage } from "./pages/WelcomePage";
import { WorkspaceHomePage } from "./pages/WorkspaceHomePage";

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route element={<AppShell />}>
        <Route path="/workspace" element={<WorkspaceHomePage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/tags-categories" element={<TagsCategoriesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ErrorBoundary>
  );
}
