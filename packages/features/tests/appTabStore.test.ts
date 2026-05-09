import { describe, expect, it } from "vitest";
import {
  APP_TABS_SETTING_KEY,
  AppTabStore,
  moveAppTab,
  type AppTab
} from "../src/navigation";
import type { AppSettingRecord } from "@local-work-os/db";

describe("AppTabStore", () => {
  it("opens tabs, dedupes existing route targets, and persists active tab", () => {
    const repository = new MemorySettingsRepository();
    let tick = 0;
    const store = new AppTabStore({
      appSettingsRepository: repository,
      idFactory: (prefix) => `${prefix}_${++tick}`,
      now: () => new Date(`2026-05-09T04:00:0${tick}.000Z`),
      limit: 4
    });

    const first = store.openTab({
      workspaceId: "workspace_1",
      target: {
        targetType: "container",
        targetId: "project_1",
        path: "/projects/project_1",
        label: "Project",
        subtitle: "Recently opened project"
      }
    });
    const second = store.openTab({
      workspaceId: "workspace_1",
      target: {
        targetType: "view",
        targetId: "search",
        path: "/search?q=launch",
        label: "Search",
        subtitle: "Local full-text search will appear here."
      }
    });
    const reopened = store.openTab({
      workspaceId: "workspace_1",
      target: {
        targetType: "container",
        targetId: "project_1",
        path: "/projects/project_1",
        label: "Launch Plan",
        subtitle: "Updated project label"
      }
    });

    expect(first.tabs).toHaveLength(1);
    expect(second.tabs.map((tab) => tab.path)).toEqual([
      "/projects/project_1",
      "/search?q=launch"
    ]);
    expect(reopened.tabs).toHaveLength(2);
    expect(reopened.tabs.at(-1)).toMatchObject({
      id: first.activeTabId,
      label: "Launch Plan",
      subtitle: "Updated project label"
    });
    expect(reopened.activeTabId).toBe(first.activeTabId);
    expect(store.listTabs("workspace_1")).toEqual(reopened);
    expect(repository.savedKeys).toEqual([
      APP_TABS_SETTING_KEY,
      APP_TABS_SETTING_KEY,
      APP_TABS_SETTING_KEY
    ]);
  });

  it("reorders tabs and chooses a neighboring active tab after close", () => {
    const repository = new MemorySettingsRepository();
    let id = 0;
    const store = new AppTabStore({
      appSettingsRepository: repository,
      idFactory: (prefix) => `${prefix}_${++id}`,
      now: () => new Date("2026-05-09T04:00:00.000Z")
    });

    const project = store.openTab({
      workspaceId: "workspace_1",
      target: target("container", "project_1", "/projects/project_1", "Project")
    });
    const contact = store.openTab({
      workspaceId: "workspace_1",
      target: target("container", "contact_1", "/contacts/contact_1", "Contact")
    });
    const search = store.openTab({
      workspaceId: "workspace_1",
      target: target("view", "search", "/search?q=client", "Search")
    });
    const [projectTab, contactTab, searchTab] = search.tabs;

    const reordered = store.reorderTabs({
      workspaceId: "workspace_1",
      tabIds: [searchTab!.id, projectTab!.id, contactTab!.id]
    });

    expect(reordered.tabs.map((tab) => tab.id)).toEqual([
      searchTab!.id,
      projectTab!.id,
      contactTab!.id
    ]);
    expect(reordered.activeTabId).toBe(search.activeTabId);

    const closed = store.closeTab({
      workspaceId: "workspace_1",
      tabId: searchTab!.id
    });

    expect(project.activeTabId).not.toBeNull();
    expect(contact.activeTabId).not.toBeNull();
    expect(closed.tabs.map((tab) => tab.id)).toEqual([projectTab!.id, contactTab!.id]);
    expect(closed.activeTabId).toBe(projectTab!.id);
  });

  it("moves app tabs left and right for renderer reorder controls", () => {
    const tabs = [tab("tab_1"), tab("tab_2"), tab("tab_3")];

    expect(moveAppTab({ tabs, tabId: "tab_2", direction: "left" }).map((entry) => entry.id))
      .toEqual(["tab_2", "tab_1", "tab_3"]);
    expect(moveAppTab({ tabs, tabId: "tab_2", direction: "right" }).map((entry) => entry.id))
      .toEqual(["tab_1", "tab_3", "tab_2"]);
    expect(moveAppTab({ tabs, tabId: "tab_1", direction: "left" }).map((entry) => entry.id))
      .toEqual(["tab_1", "tab_2", "tab_3"]);
  });
});

function target(
  targetType: "view" | "container",
  targetId: string,
  path: string,
  label: string
): {
  targetType: "view" | "container";
  targetId: string;
  path: string;
  label: string;
  subtitle: string;
} {
  return {
    targetType,
    targetId,
    path,
    label,
    subtitle: path
  };
}

function tab(id: string): AppTab {
  return {
    id,
    workspaceId: "workspace_1",
    targetType: "view",
    targetId: id,
    path: `/${id}`,
    label: id,
    subtitle: null,
    openedAt: "2026-05-09T04:00:00.000Z",
    updatedAt: "2026-05-09T04:00:00.000Z"
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
