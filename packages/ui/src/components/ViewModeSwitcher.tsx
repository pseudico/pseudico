import { CalendarDays, List, Rows3 } from "lucide-react";

export type ViewMode = "list" | "timeline" | "calendar";

export type ViewModeSwitcherProps = {
  value: ViewMode;
  disabled?: boolean;
  label?: string;
  onChange: (mode: ViewMode) => void;
};

const OPTIONS: Array<{ mode: ViewMode; label: string; icon: typeof List }> = [
  { mode: "list", label: "List", icon: List },
  { mode: "timeline", label: "Timeline", icon: Rows3 },
  { mode: "calendar", label: "Calendar", icon: CalendarDays }
];

export function ViewModeSwitcher({
  value,
  disabled = false,
  label = "View mode",
  onChange
}: ViewModeSwitcherProps): React.JSX.Element {
  return (
    <div className="view-mode-switcher" role="group" aria-label={label}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.mode}
            aria-pressed={value === option.mode}
            className="view-mode-switcher-button"
            disabled={disabled}
            type="button"
            onClick={() => onChange(option.mode)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
