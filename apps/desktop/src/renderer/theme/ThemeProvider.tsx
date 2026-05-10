import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { formatUserError } from "@local-work-os/ui";
import { desktopApiClient } from "../api/desktopApiClient";
import { showToast } from "../shell/toastStore";
import { useWorkspaceStore } from "../state/workspaceStore";
import type {
  AppearanceSettingsSummary,
  LocalWorkOsApi,
  UpdateAppearanceSettingsInput
} from "../../preload/api";

export const DEFAULT_RENDERER_APPEARANCE_SETTINGS: AppearanceSettingsSummary = {
  workspaceId: "",
  theme: "system",
  density: "comfortable",
  fontSize: "medium",
  updatedAt: null
};

type AppearanceContextValue = {
  settings: AppearanceSettingsSummary;
  loading: boolean;
  error: string | null;
  updateSettings: (
    input: Omit<UpdateAppearanceSettingsInput, "workspaceId">
  ) => Promise<AppearanceSettingsSummary>;
};

const AppearanceContext = createContext<AppearanceContextValue>({
  settings: DEFAULT_RENDERER_APPEARANCE_SETTINGS,
  loading: false,
  error: null,
  async updateSettings() {
    throw new Error("Appearance settings are not available.");
  }
});

type ThemeProviderProps = {
  apiClient?: LocalWorkOsApi;
  children: ReactNode;
  initialSettings?: AppearanceSettingsSummary;
};

export function ThemeProvider({
  apiClient = desktopApiClient,
  children,
  initialSettings = DEFAULT_RENDERER_APPEARANCE_SETTINGS
}: ThemeProviderProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [settings, setSettings] = useState<AppearanceSettingsSummary>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace === null) {
      setSettings(DEFAULT_RENDERER_APPEARANCE_SETTINGS);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    async function loadSettings(): Promise<void> {
      const result = await apiClient.appearance.getSettings(currentWorkspace!.id);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        const message = result.error.message;
        setError(message);
        showToast(message, {
          title: "Appearance unavailable",
          tone: "error"
        });
        return;
      }

      setSettings(result.data);
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  useEffect(() => {
    applyAppearanceAttributes(settings);
  }, [settings]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      settings,
      loading,
      error,
      async updateSettings(input) {
        if (currentWorkspace === null) {
          throw new Error("Open a workspace before changing appearance settings.");
        }

        setLoading(true);
        setError(null);
        const result = await apiClient.appearance.updateSettings({
          workspaceId: currentWorkspace.id,
          ...input
        });
        setLoading(false);

        if (!result.ok) {
          const message = formatUserError(result.error);
          setError(message);
          throw new Error(message);
        }

        setSettings(result.data);
        return result.data;
      }
    }),
    [apiClient, currentWorkspace, error, loading, settings]
  );

  return (
    <AppearanceContext.Provider value={value}>
      <div className={getAppearanceClassName(settings)}>{children}</div>
    </AppearanceContext.Provider>
  );
}

export function useAppearanceSettings(): AppearanceContextValue {
  return useContext(AppearanceContext);
}

export function getAppearanceClassName(
  settings: Pick<AppearanceSettingsSummary, "theme" | "density" | "fontSize">
): string {
  return [
    "appearance-root",
    `theme-${settings.theme}`,
    `density-${settings.density}`,
    `font-${settings.fontSize}`
  ].join(" ");
}

function applyAppearanceAttributes(settings: AppearanceSettingsSummary): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.density = settings.density;
  root.dataset.fontSize = settings.fontSize;
}
