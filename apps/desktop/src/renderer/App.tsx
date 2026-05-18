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
import { HelpPage } from "./pages/HelpPage";
import { InboxPage } from "./pages/InboxPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectDetailSpaceBudgetFixturePage } from "./pages/ProjectDetailSpaceBudgetFixturePage";
import { ProjectTagBrowserPage } from "./pages/ProjectTagBrowserPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SpaceBudgetPrimitiveDemoPage } from "./pages/SpaceBudgetPrimitiveDemoPage";
import { TagsCategoriesPage } from "./pages/TagsCategoriesPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { TimelinePage } from "./pages/TimelinePage";
import { TodayPage } from "./pages/TodayPage";
import { TodaySpaceBudgetFixturePage } from "./pages/TodaySpaceBudgetFixturePage";
import { TrashPage } from "./pages/TrashPage";
import { WelcomePage } from "./pages/WelcomePage";
import { WorkspaceHomePage } from "./pages/WorkspaceHomePage";
import { WorkflowsPage } from "./pages/WorkflowsPage";
import { ThemeProvider } from "./theme/ThemeProvider";

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/project-detail-space-budget-fixture" element={<ProjectDetailSpaceBudgetFixturePage />} />
      <Route element={<AppShell />}>
        <Route path="/workspace" element={<WorkspaceHomePage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/today-space-budget-fixture" element={<TodaySpaceBudgetFixturePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/project-tags" element={<ProjectTagBrowserPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contact-labels" element={<ContactLabelBrowserPage />} />
        <Route path="/contacts/:contactId" element={<ContactDetailPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/tags-categories" element={<TagsCategoriesPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/space-budget-primitives" element={<SpaceBudgetPrimitiveDemoPage />} />
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
