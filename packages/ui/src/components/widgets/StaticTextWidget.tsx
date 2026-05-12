import { DashboardWidget } from "../DashboardWidget";

export type StaticTextWidgetProps = {
  title?: string;
  text?: string | undefined;
};

export function StaticTextWidget({ title = "Static Text", text }: StaticTextWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget kind="static_text" title={title} description="Pinned local dashboard text." emptyTitle="No text configured" emptyDescription="Add text in the widget configuration to pin a quote or instruction.">
      {text === undefined || text.trim().length === 0 ? null : <blockquote className="static-text-widget">{text}</blockquote>}
    </DashboardWidget>
  );
}

