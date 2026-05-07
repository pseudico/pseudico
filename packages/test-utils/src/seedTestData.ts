export const TEST_SEED_TIMESTAMP = "2026-05-01T00:00:00.000Z";

export type TestSeedData = {
  workspaceId: string;
  workspaceName: string;
  timestamp: string;
};

export function seedTestData(
  overrides: Partial<TestSeedData> = {}
): TestSeedData {
  return {
    workspaceId: overrides.workspaceId ?? "workspace_test",
    workspaceName: overrides.workspaceName ?? "Test Workspace",
    timestamp: overrides.timestamp ?? TEST_SEED_TIMESTAMP
  };
}

export function seedSmokeData(
  overrides: Partial<TestSeedData> = {}
): TestSeedData {
  return seedTestData({
    workspaceId: "workspace_smoke",
    workspaceName: "MVP Smoke Workspace",
    timestamp: TEST_SEED_TIMESTAMP,
    ...overrides
  });
}
