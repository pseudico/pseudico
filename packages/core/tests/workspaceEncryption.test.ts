import { describe, expect, it } from "vitest";

import {
  createWorkspaceEncryptionPrototypePlan,
  isWorkspaceEncryptionMode,
  isWorkspaceKeyStorageMode
} from "../src";

describe("workspace encryption prototype planning", () => {
  it("keeps the current disabled mode explicit and non-mutating", () => {
    const plan = createWorkspaceEncryptionPrototypePlan({
      mode: "disabled",
      keyStorage: "unsupported",
      encryptAttachments: false,
      encryptBackupsAndExports: false,
      preserveSearchIndexesInEncryptedDatabase: false,
      allowRendererKeyAccess: false
    });

    expect(plan.decision).toBe("do-not-implement");
    expect(plan.gates).toEqual([]);
    expect(plan.summary).toContain("no schema");
    expect(plan.followUps).toContain(
      "Keep documenting that the current workspace format is not encrypted at rest."
    );
  });

  it("requires every production gate before an encryption shape can advance", () => {
    const plan = createWorkspaceEncryptionPrototypePlan({
      mode: "sqlcipher-database-with-file-envelope",
      keyStorage: "passphrase-required",
      encryptAttachments: true,
      encryptBackupsAndExports: true,
      preserveSearchIndexesInEncryptedDatabase: true,
      allowRendererKeyAccess: false
    });

    expect(plan.decision).toBe("candidate-for-implementation");
    expect(plan.risks).toEqual([]);
    expect(plan.gates.map((gate) => gate.id)).toEqual([
      "native-sqlcipher-adapter",
      "main-process-unlock-only",
      "attachment-envelope",
      "backup-export-policy",
      "recovery-and-rekey",
      "search-cache-audit",
      "performance-benchmark",
      "cross-platform-keychain-qa"
    ]);
  });

  it("downgrades incomplete shapes to prototype-only with concrete risks", () => {
    const plan = createWorkspaceEncryptionPrototypePlan({
      mode: "sqlcipher-database-with-file-envelope",
      keyStorage: "os-secret-convenience-unlock",
      encryptAttachments: false,
      encryptBackupsAndExports: false,
      preserveSearchIndexesInEncryptedDatabase: false,
      allowRendererKeyAccess: true
    });

    expect(plan.decision).toBe("prototype-only");
    expect(plan.risks).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Attachments would remain plaintext"),
        expect.stringContaining("Backup or export output"),
        expect.stringContaining("Renderer key access violates")
      ])
    );
    expect(plan.followUps[0]).toContain("Prototype passphrase unlock first");
  });

  it("validates supported enum values", () => {
    expect(isWorkspaceEncryptionMode("disabled")).toBe(true);
    expect(isWorkspaceEncryptionMode("sqlcipher-database-with-file-envelope")).toBe(
      true
    );
    expect(isWorkspaceEncryptionMode("homegrown-crypto")).toBe(false);

    expect(isWorkspaceKeyStorageMode("passphrase-required")).toBe(true);
    expect(isWorkspaceKeyStorageMode("os-secret-convenience-unlock")).toBe(true);
    expect(isWorkspaceKeyStorageMode("plaintext-key-file")).toBe(false);
  });
});
