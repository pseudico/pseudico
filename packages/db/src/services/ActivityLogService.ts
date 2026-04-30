import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActionValue,
  type ActivityActorType,
  type ActivityTargetType
} from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import {
  ActivityLogRepository,
  type ActivityLogRecord
} from "../repositories/ActivityLogRepository";

export type LogActivityEventInput = {
  workspaceId: string;
  actorType: ActivityActorType;
  action: ActivityActionValue;
  targetType: ActivityTargetType;
  targetId: string;
  summary?: string;
  beforeJson?: string | null;
  afterJson?: string | null;
  timestamp?: string;
  id?: string;
};

export type ActivityLogIdFactory = (prefix: string) => string;

export class ActivityLogService {
  private readonly idFactory: ActivityLogIdFactory;
  private readonly repository: ActivityLogRepository;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ActivityLogIdFactory;
  }) {
    this.repository = new ActivityLogRepository(input.connection);
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
  }

  logEvent(input: LogActivityEventInput): ActivityLogRecord {
    const timestamp = input.timestamp ?? createIsoTimestamp();

    return this.repository.create({
      id: input.id ?? this.idFactory("activity"),
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary ?? null,
      beforeJson: input.beforeJson ?? null,
      afterJson: input.afterJson ?? null,
      timestamp
    });
  }
}

export { ActivityAction };
