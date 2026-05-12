import { useEffect, useMemo, useState } from "react";
import { DashboardWidget } from "../DashboardWidget";

export type PomodoroWidgetProps = {
  focusMinutes?: number;
  breakMinutes?: number;
};

export function PomodoroWidget({ focusMinutes = 25, breakMinutes = 5 }: PomodoroWidgetProps): React.JSX.Element {
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const durationSeconds = (mode === "focus" ? focusMinutes : breakMinutes) * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  useEffect(() => {
    setRemainingSeconds(durationSeconds);
    setRunning(false);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  const label = useMemo(() => formatDuration(remainingSeconds), [remainingSeconds]);

  return (
    <DashboardWidget kind="pomodoro" title="Pomodoro" description="Local focus timer. No network or account required.">
      <div className="pomodoro-widget" data-running={running}>
        <strong>{label}</strong>
        <span>{mode === "focus" ? "Focus session" : "Break"}</span>
        <div className="button-row">
          <button className="primary-button compact-button" type="button" onClick={() => setRunning((value) => !value)}>
            {running ? "Pause" : "Start"}
          </button>
          <button className="secondary-button compact-button" type="button" onClick={() => setRemainingSeconds(durationSeconds)}>
            Reset
          </button>
          <button className="secondary-button compact-button" type="button" onClick={() => { setMode((value) => value === "focus" ? "break" : "focus"); }}>
            Switch to {mode === "focus" ? "break" : "focus"}
          </button>
        </div>
      </div>
    </DashboardWidget>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
