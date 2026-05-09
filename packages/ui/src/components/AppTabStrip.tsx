import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type AppTabStripTab = {
  id: string;
  label: string;
  subtitle: string | null;
  path: string;
};

export type AppTabStripProps = {
  tabs: readonly AppTabStripTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onMoveTab: (tabId: string, direction: "left" | "right") => void;
};

export function AppTabStrip({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onMoveTab
}: AppTabStripProps): React.JSX.Element | null {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav className="app-tab-strip" aria-label="Open app tabs">
      {tabs.map((tab, index) => {
        const selected = tab.id === activeTabId;

        return (
          <div
            className={selected ? "app-tab app-tab-active" : "app-tab"}
            key={tab.id}
          >
            <button
              type="button"
              className="app-tab-target"
              aria-current={selected ? "page" : undefined}
              title={tab.subtitle ?? tab.path}
              onClick={() => onSelectTab(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.subtitle ?? tab.path}</small>
            </button>
            <div className="app-tab-reorder" aria-label={`Reorder ${tab.label} tab`}>
              <button
                type="button"
                aria-label="Move tab left"
                disabled={index === 0}
                onClick={() => onMoveTab(tab.id, "left")}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Move tab right"
                disabled={index === tabs.length - 1}
                onClick={() => onMoveTab(tab.id, "right")}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="app-tab-close"
              aria-label={`Close ${tab.label} tab`}
              onClick={() => onCloseTab(tab.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
