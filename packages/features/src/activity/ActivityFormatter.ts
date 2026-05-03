import type { ActivityLogRecord } from "@local-work-os/db";

export type ActivityEventView = ActivityLogRecord & {
  actionLabel: string;
  actorLabel: string;
  targetLabel: string;
  description: string;
};

export function formatActivityEvent(
  event: ActivityLogRecord
): ActivityEventView {
  return {
    ...event,
    actionLabel: formatActionLabel(event.action),
    actorLabel: formatActorLabel(event.actorType),
    targetLabel: formatTargetLabel(event.targetType, event.targetId),
    description: event.summary ?? fallbackDescription(event)
  };
}

export function formatActionLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatActorLabel(actorType: string): string {
  if (actorType === "local_user") {
    return "Local user";
  }

  return formatActionLabel(actorType);
}

export function formatTargetLabel(targetType: string, targetId: string): string {
  return `${formatActionLabel(targetType)} ${targetId}`;
}

function fallbackDescription(event: ActivityLogRecord): string {
  return `${formatActorLabel(event.actorType)} recorded ${formatActionLabel(
    event.action
  ).toLowerCase()} for ${formatTargetLabel(event.targetType, event.targetId)}.`;
}
