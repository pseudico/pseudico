import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  AppTabSessionSummary,
  AppTabSummary,
  LocalWorkOsApi,
  WorkspaceSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { createAppTabTargetFromLocation } from "./navigationTargets";

export type AppTabControls = {
  tabs: AppTabSummary[];
  activeTabId: string | null;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  moveTab: (tabId: string, direction: "left" | "right") => void;
};

const EMPTY_SESSION: AppTabSessionSummary = {
  workspaceId: "",
  tabs: [],
  activeTabId: null
};

export function useAppTabs({
  apiClient = desktopApiClient,
  workspace
}: {
  apiClient?: LocalWorkOsApi;
  workspace: WorkspaceSummary | null;
}): AppTabControls {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<AppTabSessionSummary>(EMPTY_SESSION);
  const latestSessionRef = useRef<AppTabSessionSummary>(EMPTY_SESSION);
  const currentRoute = `${location.pathname}${location.search}`;

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (workspace === null) {
      setSession(EMPTY_SESSION);
      return;
    }

    const workspaceId = workspace.id;
    let active = true;

    async function loadTabs(): Promise<void> {
      const result = await apiClient.navigation.listAppTabs(workspaceId);

      if (active && result.ok) {
        setSession(result.data);
      }
    }

    void loadTabs();

    return () => {
      active = false;
    };
  }, [apiClient, workspace]);

  useEffect(() => {
    if (workspace === null) {
      return;
    }

    const target = createAppTabTargetFromLocation({
      pathname: location.pathname,
      search: location.search
    });

    if (target === null) {
      return;
    }

    const workspaceId = workspace.id;
    const targetToOpen = target;
    let active = true;

    async function openCurrentTab(): Promise<void> {
      const result = await apiClient.navigation.openAppTab({
        workspaceId,
        target: targetToOpen
      });

      if (active && result.ok) {
        setSession(result.data);
      }
    }

    void openCurrentTab();

    return () => {
      active = false;
    };
  }, [apiClient, currentRoute, location.pathname, location.search, workspace]);

  const selectTab = useCallback(
    (tabId: string) => {
      const tab = latestSessionRef.current.tabs.find((entry) => entry.id === tabId);

      if (tab === undefined || workspace === null) {
        return;
      }

      void apiClient.navigation.setActiveAppTab({
        workspaceId: workspace.id,
        tabId
      }).then((result) => {
        if (result.ok) {
          setSession(result.data);
        }
      });
      navigate(tab.path);
    },
    [apiClient, navigate, workspace]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const closingTab = latestSessionRef.current.tabs.find(
        (entry) => entry.id === tabId
      );

      if (closingTab === undefined || workspace === null) {
        return;
      }

      void apiClient.navigation.closeAppTab({
        workspaceId: workspace.id,
        tabId
      }).then((result) => {
        if (!result.ok) {
          return;
        }

        setSession(result.data);

        if (closingTab.path !== currentRoute) {
          return;
        }

        const activeTab = result.data.tabs.find(
          (entry) => entry.id === result.data.activeTabId
        );
        navigate(activeTab?.path ?? "/workspace");
      });
    },
    [apiClient, currentRoute, navigate, workspace]
  );

  const moveTab = useCallback(
    (tabId: string, direction: "left" | "right") => {
      const nextTabs = moveAppTabs({
        tabs: latestSessionRef.current.tabs,
        tabId,
        direction
      });

      if (workspace === null) {
        return;
      }

      void apiClient.navigation.reorderAppTabs({
        workspaceId: workspace.id,
        tabIds: nextTabs.map((tab) => tab.id)
      }).then((result) => {
        if (result.ok) {
          setSession(result.data);
        }
      });
    },
    [apiClient, workspace]
  );

  return useMemo(
    () => ({
      tabs: session.tabs,
      activeTabId: session.activeTabId,
      selectTab,
      closeTab,
      moveTab
    }),
    [closeTab, moveTab, selectTab, session.activeTabId, session.tabs]
  );
}


function moveAppTabs(input: {
  tabs: readonly AppTabSummary[];
  tabId: string;
  direction: "left" | "right";
}): AppTabSummary[] {
  const index = input.tabs.findIndex((tab) => tab.id === input.tabId);

  if (index === -1) {
    return [...input.tabs];
  }

  const targetIndex = input.direction === "left" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= input.tabs.length) {
    return [...input.tabs];
  }

  const nextTabs = [...input.tabs];
  const [tab] = nextTabs.splice(index, 1);
  nextTabs.splice(targetIndex, 0, tab!);

  return nextTabs;
}
