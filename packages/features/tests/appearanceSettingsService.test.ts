import { describe, expect, it } from "vitest";
import {
  APPEARANCE_SETTINGS_KEY,
  AppearanceSettingsService,
  DEFAULT_APPEARANCE_SETTINGS,
  normalizeAppearanceSettingsValue
} from "../src/appearance";
import type { AppSettingRecord } from "@local-work-os/db";

describe("AppearanceSettingsService", () => {
  it("returns defaults before a workspace has persisted appearance settings", () => {
    const repository = new MemorySettingsRepository();
    const service = new AppearanceSettingsService({
      appSettingsRepository: repository,
      logActivity: false
    });

    expect(service.getSettings("workspace_1")).toEqual({
      workspaceId: "workspace_1",
      updatedAt: null,
      ...DEFAULT_APPEARANCE_SETTINGS
    });
  });

  it("persists validated theme, density, and font-size preferences", async () => {
    const repository = new MemorySettingsRepository();
    let id = 0;
    const service = new AppearanceSettingsService({
      appSettingsRepository: repository,
      idFactory: (prefix) => `${prefix}_${++id}`,
      now: () => new Date("2026-05-10T03:20:00.000Z"),
      logActivity: false
    });

    const saved = await service.updateSettings({
      workspaceId: "workspace_1",
      theme: "dark",
      density: "compact",
      fontSize: "large"
    });

    expect(saved).toEqual({
      workspaceId: "workspace_1",
      theme: "dark",
      density: "compact",
      fontSize: "large",
      updatedAt: "2026-05-10T03:20:00.000Z"
    });
    expect(repository.savedKeys).toEqual([APPEARANCE_SETTINGS_KEY]);
    expect(service.getSettings("workspace_1")).toEqual(saved);
  });

  it("keeps existing values when saving a partial preference patch", async () => {
    const repository = new MemorySettingsRepository();
    const service = new AppearanceSettingsService({
      appSettingsRepository: repository,
      now: () => new Date("2026-05-10T03:21:00.000Z"),
      logActivity: false
    });

    await service.updateSettings({
      workspaceId: "workspace_1",
      theme: "light",
      density: "compact",
      fontSize: "small"
    });
    const updated = await service.updateSettings({
      workspaceId: "workspace_1",
      fontSize: "medium"
    });

    expect(updated).toMatchObject({
      theme: "light",
      density: "compact",
      fontSize: "medium"
    });
  });

  it("normalizes malformed stored payloads back to safe defaults", () => {
    expect(
      normalizeAppearanceSettingsValue({
        version: 1,
        theme: "neon",
        density: "tiny",
        fontSize: "massive"
      })
    ).toEqual(DEFAULT_APPEARANCE_SETTINGS);
  });

  it("rejects invalid preference writes", async () => {
    const service = new AppearanceSettingsService({
      appSettingsRepository: new MemorySettingsRepository(),
      logActivity: false
    });

    await expect(
      service.updateSettings({
        workspaceId: "workspace_1",
        theme: "neon" as "dark"
      })
    ).rejects.toThrow("theme must be system, light, or dark.");
  });
});

class MemorySettingsRepository {
  readonly savedKeys: string[] = [];
  private setting: AppSettingRecord | null = null;

  findByKey(input: { workspaceId: string; settingKey: string }): AppSettingRecord | null {
    if (
      this.setting?.workspaceId !== input.workspaceId ||
      this.setting.settingKey !== input.settingKey
    ) {
      return null;
    }

    return this.setting;
  }

  upsert(input: {
    id: string;
    workspaceId: string;
    settingKey: string;
    valueJson: string;
    timestamp: string;
  }): AppSettingRecord {
    this.savedKeys.push(input.settingKey);
    this.setting = {
      id: input.id,
      workspaceId: input.workspaceId,
      settingKey: input.settingKey,
      valueJson: input.valueJson,
      createdAt: this.setting?.createdAt ?? input.timestamp,
      updatedAt: input.timestamp
    };

    return this.setting;
  }
}
