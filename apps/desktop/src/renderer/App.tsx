import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./shell/ErrorBoundary";
import { AppShell } from "./shell/AppShell";
import { ToastHost } from "./shell/toastStore";
import { CollectionsPage } from "./pages/CollectionsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ContactsPage } from "./pages/ContactsPage";
import { ContactDetailPage } from "./pages/ContactDetailPage";
import { ContactLabelBrowserPage } from "./pages/ContactLabelBrowserPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InboxPage } from "./pages/InboxPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectTagBrowserPage } from "./pages/ProjectTagBrowserPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TagsCategoriesPage } from "./pages/TagsCategoriesPage";
import { TimelinePage } from "./pages/TimelinePage";
import { TodayPage } from "./pages/TodayPage";
import { TrashPage } from "./pages/TrashPage";
import { WelcomePage } from "./pages/WelcomePage";
import { WorkspaceHomePage } from "./pages/WorkspaceHomePage";
import { ThemeProvider } from "./theme/ThemeProvider";

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
        <Route path="/project-tags" element={<ProjectTagBrowserPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contact-labels" element={<ContactLabelBrowserPage />} />
        <Route path="/contacts/:contactId" element={<ContactDetailPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/tags-categories" element={<TagsCategoriesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/trash" element={<TrashPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ThemeProvider>
      <ToastHost />
    </ErrorBoundary>
  );
}
