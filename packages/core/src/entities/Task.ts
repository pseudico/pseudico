import type { ItemStatus } from "./Item";

export const TASK_STATUSES = ["open", "done", "waiting", "someday", "deferred", "cancelled"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskDateRange = {
  startInclusive: string;
  endExclusive: string;
};

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function taskStatusToItemStatus(status: TaskStatus): ItemStatus {
  if (status === "done") {
    return "completed";
  }

  if (status === "waiting" || status === "someday" || status === "deferred") {
    return "waiting";
  }

  return "active";
}
