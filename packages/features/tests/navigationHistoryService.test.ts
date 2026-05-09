import { describe, expect, it } from "vitest";
import {
  NavigationHistoryService,
  RECENT_NAVIGATION_TARGETS_SETTING_KEY,
  mergeRecentTarget,
  type NavigationRecentTarget
} from "../src/navigation";
import type { AppSettingRecord } from "@local-work-os/db";

describe("NavigationHistoryService", () => {
  it("dedupes recent targets newest-first and respects the configured bound", () => {
    const existing = target("view", "today", "/today", "Today", 1);
    const duplicate = target("view", "today", "/today", "Today", 2);
    const project = target("container", "project_1", "/projects/project_1", "Project", 3);

    expect(
      mergeRecentTarget({
        entries: [existing, project],
        nextEntry: duplicate,
        limit: 2
      })
    ).toEqual([duplicate, project]);
  });

  it("persists workspace recent targets through app settings", () => {
    const repository = new MemorySettingsRepository();
    const service = new NavigationHistoryService({
      appSettingsRepository: repository,
      idFactory: () => "setting_1",
      now: () => new Date("2026-05-09T04:00:00.000Z"),
      limit: 2
    });

    service.recordTarget({
      workspaceId: "workspace_1",
      target: {
        targetType: "view",
        targetId: "today",
        path: "/today",
        label: "Today",
        subtitle: "Daily plan"
      }
    });
    const entries = service.recordTarget({
      workspaceId: "workspace_1",
      target: {
        targetType: "container",
        targetId: "project_1",
        path: "/projects/project_1",
        label: "Project",
        subtitle: "Recently opened project"
      }
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.targetId).toBe("project_1");
    expect(service.listRecentTargets("workspace_1")).toEqual(entries);
    expect(repository.savedKeys).toEqual([
      RECENT_NAVIGATION_TARGETS_SETTING_KEY,
      RECENT_NAVIGATION_TARGETS_SETTING_KEY
    ]);
  });
});

function target(
  targetType: NavigationRecentTarget["targetType"],
  targetId: string,
  path: string,
  label: string,
  index: number
): NavigationRecentTarget {
  return {
    targetType,
    targetId,
    workspaceId: "workspace_1",
    path,
    label,
    subtitle: null,
    viewedAt: `2026-05-09T04:00:0${index}.000Z`
  };
}

class MemorySettingsRepository {
  readonly savedKeys: string[] = [];
  private setting: AppSettingRecord | null = null;

  findByKey(): AppSettingRecord | null {
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
      createdAt: input.timestamp,
      updatedAt: input.timestamp
    };

    return this.setting;
  }
}
