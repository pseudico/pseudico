import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import {
  ActivityLogRepository,
  AppSettingsRepository,
  ContainerRepository,
  ContainerTabRepository,
  DashboardRepository,
  SavedViewRepository,
  SearchIndexRepository,
  WorkspaceRepository,
  type ActivityLogRecord,
  type AppSettingRecord,
  type ContainerRecord,
  type ContainerTabRecord,
  type DashboardRecord,
  type DashboardWidgetRecord,
  type SavedViewRecord,
  type WorkspaceRecord
} from "../repositories";

export const DEFAULT_DASHBOARD_WIDGET_TYPES = [
  "today",
  "overdue",
  "upcoming",
  "favorites",
  "recent_activity",
  "project_health"
] as const;

export const DEFAULT_APP_SETTINGS = [
  {
    key: "default_view",
    value: "dashboard"
  },
  {
    key: "today_backlog_days",
    value: 14
  },
  {
    key: "backup_retention",
    value: 10
  },
  {
    key: "reminder_preferences",
    value: {
      notificationsEnabled: true,
      tasks: {
        enabled: false,
        anchor: "due",
        leadMinutes: 1440
      },
      listItems: {
        enabled: false,
        anchor: "due",
        leadMinutes: 1440
      }
    }
  },
  {
    key: "privacy.network.settings.v1",
    value: {
      version: 1,
      telemetryEnabled: false,
      metadataFetchEnabled: false,
      webWidgetsEnabled: false,
      icsUrlImportEnabled: false,
      imapImportEnabled: false,
      browserCaptureEnabled: false
    }
  }
] as const;

export type IdFactory = (prefix: string) => string;

export type SeedRowStatus<TRecord> = {
  record: TRecord;
  created: boolean;
};

export type WorkspaceSeedInput = {
  workspaceId: string;
  workspaceName: string;
  schemaVersion: number;
};

export type WorkspaceSeedResult = {
  workspace: SeedRowStatus<WorkspaceRecord>;
  systemInbox: SeedRowStatus<ContainerRecord>;
  systemInboxDefaultTab: SeedRowStatus<ContainerTabRecord>;
  defaultDashboard: SeedRowStatus<DashboardRecord>;
  defaultDashboardWidgets: Array<SeedRowStatus<DashboardWidgetRecord>>;
  defaultSavedViews: Array<SeedRowStatus<SavedViewRecord>>;
  defaultSettings: Array<SeedRowStatus<AppSettingRecord>>;
  workspaceCreatedActivity: SeedRowStatus<ActivityLogRecord>;
};

export class WorkspaceSeedService {
  private readonly activityLogRepository: ActivityLogRepository;
  private readonly appSettingsRepository: AppSettingsRepository;
  private readonly connection: DatabaseConnection;
  private readonly containerRepository: ContainerRepository;
  private readonly containerTabRepository: ContainerTabRepository;
  private readonly dashboardRepository: DashboardRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => Date;
  private readonly savedViewRepository: SavedViewRepository;
  private readonly searchIndexRepository: SearchIndexRepository;
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(input: {
    connection: DatabaseConnection;
    now?: () => Date;
    idFactory?: IdFactory;
  }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
    this.idFactory = input.idFactory ?? ((prefix) => createSeedId(prefix));
    this.activityLogRepository = new ActivityLogRepository(input.connection);
    this.appSettingsRepository = new AppSettingsRepository(input.connection);
    this.containerRepository = new ContainerRepository(input.connection);
    this.containerTabRepository = new ContainerTabRepository(input.connection);
    this.dashboardRepository = new DashboardRepository(input.connection);
    this.savedViewRepository = new SavedViewRepository(input.connection);
    this.searchIndexRepository = new SearchIndexRepository(input.connection);
    this.workspaceRepository = new WorkspaceRepository(input.connection);
  }

  ensureWorkspaceSeed(input: WorkspaceSeedInput): WorkspaceSeedResult {
    const timestamp = createIsoTimestamp(this.now());
    const seedWorkspace = this.connection.sqlite.transaction(
      (): WorkspaceSeedResult => {
        const workspace = this.ensureWorkspace(input, timestamp);
        const systemInbox = this.ensureSystemInbox(workspace.record.id, timestamp);
        this.ensureSystemInboxSearchIndex(systemInbox.record, timestamp);
        const systemInboxDefaultTab = this.ensureSystemInboxDefaultTab(
          workspace.record.id,
          systemInbox.record.id,
          timestamp
        );
        const defaultDashboard = this.ensureDefaultDashboard(
          workspace.record.id,
          timestamp
        );
        const defaultDashboardWidgets = this.ensureDefaultDashboardWidgets(
          workspace.record.id,
          defaultDashboard.record.id,
          timestamp
        );
        const defaultSavedViews = this.ensureDefaultSavedViews(
          workspace.record.id,
          timestamp
        );
        const defaultSettings = this.ensureDefaultSettings(
          workspace.record.id,
          timestamp
        );
        const workspaceCreatedActivity = this.ensureWorkspaceCreatedActivity(
          workspace.record,
          timestamp
        );

        return {
          workspace,
          systemInbox,
          systemInboxDefaultTab,
          defaultDashboard,
          defaultDashboardWidgets,
          defaultSavedViews,
          defaultSettings,
          workspaceCreatedActivity
        };
      }
    );

    return seedWorkspace();
  }

  private ensureWorkspace(
    input: WorkspaceSeedInput,
    timestamp: string
  ): SeedRowStatus<WorkspaceRecord> {
    const existing = this.workspaceRepository.findById(input.workspaceId);

    if (existing !== null) {
      return {
        record: existing,
        created: false
      };
    }

    return {
      record: this.workspaceRepository.create({
        id: input.workspaceId,
        name: input.workspaceName,
        schemaVersion: input.schemaVersion,
        timestamp
      }),
      created: true
    };
  }

  private ensureSystemInbox(
    workspaceId: string,
    timestamp: string
  ): SeedRowStatus<ContainerRecord> {
    const existing = this.containerRepository.findSystemInbox(workspaceId);

    if (existing !== null) {
      return {
        record: existing,
        created: false
      };
    }

    return {
      record: this.containerRepository.createSystemInbox({
        id: this.idFactory("container"),
        workspaceId,
        timestamp
      }),
      created: true
    };
  }

  private ensureSystemInboxDefaultTab(
    workspaceId: string,
    containerId: string,
    timestamp: string
  ): SeedRowStatus<ContainerTabRecord> {
    const existing = this.containerTabRepository.findDefaultTab(containerId);

    if (existing !== null) {
      return {
        record: existing,
        created: false
      };
    }

    return {
      record: this.containerTabRepository.createDefaultTab({
        id: this.idFactory("container_tab"),
        workspaceId,
        containerId,
        timestamp
      }),
      created: true
    };
  }

  private ensureSystemInboxSearchIndex(
    systemInbox: ContainerRecord,
    timestamp: string
  ): void {
    this.searchIndexRepository.upsert({
      id: this.idFactory("search"),
      workspaceId: systemInbox.workspaceId,
      targetType: "container",
      targetId: systemInbox.id,
      title: systemInbox.name,
      body: systemInbox.description ?? "",
      metadataJson: JSON.stringify({
        type: systemInbox.type,
        slug: systemInbox.slug,
        status: systemInbox.status,
        isFavorite: systemInbox.isFavorite,
        isSystem: systemInbox.isSystem,
        archivedAt: systemInbox.archivedAt,
        deletedAt: systemInbox.deletedAt
      }),
      isDeleted: systemInbox.deletedAt !== null || systemInbox.archivedAt !== null,
      timestamp
    });
  }

  private ensureDefaultDashboard(
    workspaceId: string,
    timestamp: string
  ): SeedRowStatus<DashboardRecord> {
    const existing = this.dashboardRepository.findDefaultDashboard(workspaceId);

    if (existing !== null) {
      return {
        record: existing,
        created: false
      };
    }

    return {
      record: this.dashboardRepository.createDefaultDashboard({
        id: this.idFactory("dashboard"),
        workspaceId,
        timestamp
      }),
      created: true
    };
  }

  private ensureDefaultDashboardWidgets(
    workspaceId: string,
    dashboardId: string,
    timestamp: string
  ): Array<SeedRowStatus<DashboardWidgetRecord>> {
    return DEFAULT_DASHBOARD_WIDGET_TYPES.map((type, index) => {
      const existing = this.dashboardRepository.findWidgetByType({
        dashboardId,
        type
      });

      if (existing !== null) {
        return {
          record: existing,
          created: false
        };
      }

      return {
        record: this.dashboardRepository.createWidget({
          id: this.idFactory("dashboard_widget"),
          workspaceId,
          dashboardId,
          type,
          title: dashboardWidgetTitle(type),
          sortOrder: index,
          configJson: "{}",
          positionJson: JSON.stringify({
            column: index % 2,
            row: Math.floor(index / 2)
          }),
          timestamp
        }),
        created: true
      };
    });
  }

  private ensureDefaultSettings(
    workspaceId: string,
    timestamp: string
  ): Array<SeedRowStatus<AppSettingRecord>> {
    return DEFAULT_APP_SETTINGS.map((setting) => {
      const existing = this.appSettingsRepository.findByKey({
        workspaceId,
        settingKey: setting.key
      });

      if (existing !== null) {
        return {
          record: existing,
          created: false
        };
      }

      return {
        record: this.appSettingsRepository.create({
          id: this.idFactory("app_setting"),
          workspaceId,
          settingKey: setting.key,
          valueJson: JSON.stringify(setting.value),
          timestamp
        }),
        created: true
      };
    });
  }

  private ensureDefaultSavedViews(
    workspaceId: string,
    timestamp: string
  ): Array<SeedRowStatus<SavedViewRecord>> {
    const existing = this.savedViewRepository
      .listByWorkspace(workspaceId, { type: "smart_list" })
      .find((view) => view.name === "Someday / Waiting Review");

    if (existing !== undefined) {
      return [
        {
          record: existing,
          created: false
        }
      ];
    }

    return [
      {
        record: this.savedViewRepository.create({
          id: this.idFactory("saved_view"),
          workspaceId,
          type: "smart_list",
          name: "Someday / Waiting Review",
          description:
            "Review waiting, someday, and deferred tasks that stay out of Today by default.",
          queryJson: JSON.stringify({
            version: 1,
            match: "all",
            targets: ["item"],
            conditions: [
              { field: "itemType", operator: "is", value: "task" },
              {
                field: "taskStatus",
                operator: "in",
                value: ["waiting", "someday", "deferred"]
              }
            ],
            groupBy: "status",
            sort: [
              { field: "dueAt", direction: "asc" },
              { field: "updatedAt", direction: "desc" }
            ]
          }),
          displayJson: JSON.stringify({
            kind: "task_review",
            emptyState:
              "No waiting, someday, or deferred tasks need review right now."
          }),
          isFavorite: true,
          timestamp
        }),
        created: true
      }
    ];
  }

  private ensureWorkspaceCreatedActivity(
    workspace: WorkspaceRecord,
    timestamp: string
  ): SeedRowStatus<ActivityLogRecord> {
    const existing = this.activityLogRepository.findWorkspaceCreated(workspace.id);

    if (existing !== null) {
      return {
        record: existing,
        created: false
      };
    }

    return {
      record: this.activityLogRepository.create({
        id: this.idFactory("activity"),
        workspaceId: workspace.id,
        actorType: "system",
        action: "workspace_created",
        targetType: "workspace",
        targetId: workspace.id,
        summary: `Created workspace "${workspace.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify({
          id: workspace.id,
          name: workspace.name,
          schemaVersion: workspace.schemaVersion
        }),
        timestamp
      }),
      created: true
    };
  }
}

function dashboardWidgetTitle(
  type: (typeof DEFAULT_DASHBOARD_WIDGET_TYPES)[number]
): string {
  switch (type) {
    case "today":
      return "Today";
    case "overdue":
      return "Overdue";
    case "upcoming":
      return "Upcoming";
    case "favorites":
      return "Favorite Projects";
    case "recent_activity":
      return "Recent Activity";
    case "project_health":
      return "Project Health";
  }
}

function createIsoTimestamp(date: Date): string {
  return date.toISOString();
}

function createSeedId(
  prefix: string,
  date: Date = new Date(),
  random: () => number = Math.random
): string {
  const safePrefix = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = date.getTime().toString(36);
  const entropy = Math.floor(random() * Number.MAX_SAFE_INTEGER)
    .toString(36)
    .padStart(11, "0")
    .slice(0, 11);

  return `${safePrefix}_${timestamp}_${entropy}`;
}
