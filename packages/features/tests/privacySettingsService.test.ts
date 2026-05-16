import { describe, expect, it } from "vitest";
import type { AppSettingRecord } from "@local-work-os/db";
import {
  DEFAULT_PRIVACY_NETWORK_SETTINGS,
  NETWORK_FEATURE_IDS,
  PRIVACY_NETWORK_SETTINGS_KEY,
  PRIVACY_TELEMETRY_NOTICE,
  PrivacySettingsService,
  networkFeatureDisabledMessage,
  normalizePrivacyNetworkSettingsValue
} from "../src/privacy";

describe("PrivacySettingsService", () => {
  it("returns no-telemetry, network-off defaults before persistence", () => {
    const service = new PrivacySettingsService({
      appSettingsRepository: new MemorySettingsRepository(),
      logActivity: false
    });

    expect(service.getSettings("workspace_1")).toEqual({
      workspaceId: "workspace_1",
      updatedAt: null,
      telemetryEnabled: false,
      telemetryNotice: PRIVACY_TELEMETRY_NOTICE,
      ...DEFAULT_PRIVACY_NETWORK_SETTINGS
    });
    for (const featureId of NETWORK_FEATURE_IDS) {
      expect(service.isFeatureEnabled("workspace_1", featureId)).toBe(false);
      expect(() => service.assertFeatureAllowed("workspace_1", featureId)).toThrow(
        networkFeatureDisabledMessage(featureId)
      );
    }
  });

  it("persists explicit optional network feature preferences", async () => {
    const repository = new MemorySettingsRepository();
    let id = 0;
    const service = new PrivacySettingsService({
      appSettingsRepository: repository,
      idFactory: (prefix) => `${prefix}_${++id}`,
      now: () => new Date("2026-05-14T02:30:00.000Z"),
      logActivity: false
    });

    const saved = await service.updateSettings({
      workspaceId: "workspace_1",
      metadataFetchEnabled: true,
      icsUrlImportEnabled: true,
      imapImportEnabled: true
    });

    expect(saved).toMatchObject({
      workspaceId: "workspace_1",
      metadataFetchEnabled: true,
      webWidgetsEnabled: false,
      icsUrlImportEnabled: true,
      imapImportEnabled: true,
      browserCaptureEnabled: false,
      telemetryEnabled: false,
      updatedAt: "2026-05-14T02:30:00.000Z"
    });
    expect(repository.savedKeys).toEqual([PRIVACY_NETWORK_SETTINGS_KEY]);
    expect(service.getSettings("workspace_1")).toEqual(saved);
  });

  it("guards disabled network features with clear messages", async () => {
    const service = new PrivacySettingsService({
      appSettingsRepository: new MemorySettingsRepository(),
      logActivity: false
    });

    expect(() =>
      service.assertFeatureAllowed("workspace_1", "metadataFetch")
    ).toThrow(networkFeatureDisabledMessage("metadataFetch"));

    await service.updateSettings({
      workspaceId: "workspace_1",
      metadataFetchEnabled: true
    });

    expect(() =>
      service.assertFeatureAllowed("workspace_1", "metadataFetch")
    ).not.toThrow();
  });

  it("normalizes malformed stored payloads back to network-off defaults", () => {
    expect(
      normalizePrivacyNetworkSettingsValue({
        version: 1,
        metadataFetchEnabled: "yes",
        webWidgetsEnabled: 1,
        icsUrlImportEnabled: null,
        imapImportEnabled: false,
        browserCaptureEnabled: true
      })
    ).toEqual({
      ...DEFAULT_PRIVACY_NETWORK_SETTINGS,
      browserCaptureEnabled: true
    });
  });
});

class MemorySettingsRepository {
  readonly savedKeys: string[] = [];
  private setting: AppSettingRecord | null = null;

  findByKey(input: {
    workspaceId: string;
    settingKey: string;
  }): AppSettingRecord | null {
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
