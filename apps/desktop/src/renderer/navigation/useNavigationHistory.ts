import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  LocalWorkOsApi,
  NavigationRecentTargetSummary,
  WorkspaceSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import {
  createNavigationTargetFromLocation,
  getRecentTargetDestination
} from "./navigationTargets";

export type NavigationHistoryControls = {
  canGoBack: boolean;
  canGoForward: boolean;
  recentTargets: NavigationRecentTargetSummary[];
  goBack: () => void;
  goForward: () => void;
  navigateToRecent: (target: NavigationRecentTargetSummary) => void;
};

export function useNavigationHistory({
  apiClient = desktopApiClient,
  workspace
}: {
  apiClient?: LocalWorkOsApi;
  workspace: WorkspaceSummary | null;
}): NavigationHistoryControls {
  const location = useLocation();
  const navigate = useNavigate();
  const [recentTargets, setRecentTargets] = useState<
    NavigationRecentTargetSummary[]
  >([]);
  const [historyState, setHistoryState] = useState({
    canGoBack: false,
    canGoForward: false
  });
  const routeStackRef = useRef<string[]>([]);
  const routeIndexRef = useRef(-1);
  const programmaticNavigationRef = useRef<"back" | "forward" | null>(null);
  const currentRoute = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (workspace === null) {
      setRecentTargets([]);
      return;
    }

    const workspaceId = workspace.id;
    let active = true;

    async function loadRecentTargets(): Promise<void> {
      const result = await apiClient.navigation.listRecentTargets(workspaceId);

      if (active && result.ok) {
        setRecentTargets(result.data);
      }
    }

    void loadRecentTargets();

    return () => {
      active = false;
    };
  }, [apiClient, workspace]);

  useEffect(() => {
    const navigationDirection = programmaticNavigationRef.current;
    programmaticNavigationRef.current = null;

    if (navigationDirection === "back") {
      routeIndexRef.current = Math.max(0, routeIndexRef.current - 1);
    } else if (navigationDirection === "forward") {
      routeIndexRef.current = Math.min(
        routeStackRef.current.length - 1,
        routeIndexRef.current + 1
      );
    } else if (routeStackRef.current[routeIndexRef.current] !== currentRoute) {
      routeStackRef.current = routeStackRef.current.slice(
        0,
        routeIndexRef.current + 1
      );
      routeStackRef.current.push(currentRoute);
      routeIndexRef.current = routeStackRef.current.length - 1;
    }

    setHistoryState({
      canGoBack: routeIndexRef.current > 0,
      canGoForward: routeIndexRef.current < routeStackRef.current.length - 1
    });
  }, [currentRoute]);

  useEffect(() => {
    if (workspace === null) {
      return;
    }

    const target = createNavigationTargetFromLocation({
      pathname: location.pathname,
      search: location.search
    });

    if (target === null) {
      return;
    }

    const workspaceId = workspace.id;
    const targetToRecord = target;
    let active = true;

    async function recordTarget(): Promise<void> {
      const result = await apiClient.navigation.recordTarget({
        workspaceId,
        target: targetToRecord
      });

      if (active && result.ok) {
        setRecentTargets(result.data);
      }
    }

    void recordTarget();

    return () => {
      active = false;
    };
  }, [apiClient, location.pathname, location.search, workspace]);

  const goBack = useCallback(() => {
    if (routeIndexRef.current <= 0) {
      return;
    }

    programmaticNavigationRef.current = "back";
    navigate(routeStackRef.current[routeIndexRef.current - 1]!);
  }, [navigate]);

  const goForward = useCallback(() => {
    if (routeIndexRef.current >= routeStackRef.current.length - 1) {
      return;
    }

    programmaticNavigationRef.current = "forward";
    navigate(routeStackRef.current[routeIndexRef.current + 1]!);
  }, [navigate]);

  const navigateToRecent = useCallback(
    (target: NavigationRecentTargetSummary) => {
      navigate(getRecentTargetDestination(target));
    },
    [navigate]
  );

  return {
    ...historyState,
    recentTargets,
    goBack,
    goForward,
    navigateToRecent
  };
}
