import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityLogRepository,
  type ActivityLogRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  formatActivityEvent,
  type ActivityEventView
} from "./ActivityFormatter";

export class ActivityService {
  readonly module = "activity";

  private readonly repository: ActivityLogRepository;

  constructor(input: { connection: DatabaseConnection }) {
    this.repository = new ActivityLogRepository(input.connection);
  }

  listRecentActivity(workspaceId: string, limit = 20): ActivityEventView[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return this.repository
      .listRecent(workspaceId, normalizeLimit(limit))
      .map(formatActivityEvent);
  }

  listActivityForTarget(
    targetType: string,
    targetId: string,
    limit = 20
  ): ActivityEventView[] {
    validateNonEmptyString(targetType, "targetType");
    validateNonEmptyString(targetId, "targetId");

    return this.repository
      .listForTarget(targetType, targetId, normalizeLimit(limit))
      .map(formatActivityEvent);
  }
}

export const activityModuleContract = {
  module: "activity",
  purpose:
    "Expose persisted activity log events as recent and target-specific activity streams.",
  owns: ["activity feed queries", "activity event formatting"],
  doesNotOwn: ["write orchestration", "undo behavior", "raw renderer database access"],
  integrationPoints: ["projects", "items", "dashboard", "activity log"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

export type { ActivityLogRecord, ActivityEventView };

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) {
    return 20;
  }

  return Math.min(Math.floor(limit), 100);
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
