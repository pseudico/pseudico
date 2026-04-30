import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type AppSettingRow = {
  id: string;
  workspace_id: string;
  setting_key: string;
  value_json: string;
  created_at: string;
  updated_at: string;
};

export type AppSettingRecord = {
  id: string;
  workspaceId: string;
  settingKey: string;
  valueJson: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAppSettingInput = {
  id: string;
  workspaceId: string;
  settingKey: string;
  valueJson: string;
  timestamp: string;
};

export class AppSettingsRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  findByKey(input: {
    workspaceId: string;
    settingKey: string;
  }): AppSettingRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string], AppSettingRow>(
        `select *
         from app_settings
         where workspace_id = ?
           and setting_key = ?
         limit 1`
      )
      .get(input.workspaceId, input.settingKey);

    return row === undefined ? null : toAppSettingRecord(row);
  }

  create(input: CreateAppSettingInput): AppSettingRecord {
    this.connection.sqlite
      .prepare(
        `insert into app_settings (
          id,
          workspace_id,
          setting_key,
          value_json,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.settingKey,
        input.valueJson,
        input.timestamp,
        input.timestamp
      );

    const created = this.findByKey({
      workspaceId: input.workspaceId,
      settingKey: input.settingKey
    });

    if (created === null) {
      throw new Error(`App setting was not created: ${input.settingKey}.`);
    }

    return created;
  }
}

function toAppSettingRecord(row: AppSettingRow): AppSettingRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    settingKey: row.setting_key,
    valueJson: row.value_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
