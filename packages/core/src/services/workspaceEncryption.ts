export const WORKSPACE_ENCRYPTION_MODES = [
  "disabled",
  "sqlcipher-database-with-file-envelope"
] as const;

export type WorkspaceEncryptionMode = (typeof WORKSPACE_ENCRYPTION_MODES)[number];

export const WORKSPACE_KEY_STORAGE_MODES = [
  "passphrase-required",
  "os-secret-convenience-unlock",
  "unsupported"
] as const;

export type WorkspaceKeyStorageMode = (typeof WORKSPACE_KEY_STORAGE_MODES)[number];

export const WORKSPACE_ENCRYPTION_GATE_IDS = [
  "native-sqlcipher-adapter",
  "main-process-unlock-only",
  "attachment-envelope",
  "backup-export-policy",
  "recovery-and-rekey",
  "search-cache-audit",
  "performance-benchmark",
  "cross-platform-keychain-qa"
] as const;

export type WorkspaceEncryptionGateId = (typeof WORKSPACE_ENCRYPTION_GATE_IDS)[number];

export type WorkspaceEncryptionGate = {
  id: WorkspaceEncryptionGateId;
  title: string;
  required: boolean;
  rationale: string;
};

export type WorkspaceEncryptionPrototypeInput = {
  mode: WorkspaceEncryptionMode;
  keyStorage: WorkspaceKeyStorageMode;
  encryptAttachments: boolean;
  encryptBackupsAndExports: boolean;
  preserveSearchIndexesInEncryptedDatabase: boolean;
  allowRendererKeyAccess: boolean;
};

export type WorkspaceEncryptionPrototypePlan = {
  decision: "do-not-implement" | "prototype-only" | "candidate-for-implementation";
  summary: string;
  gates: WorkspaceEncryptionGate[];
  risks: string[];
  followUps: string[];
};

const requiredGates: WorkspaceEncryptionGate[] = [
  {
    id: "native-sqlcipher-adapter",
    title: "Prove SQLCipher-compatible native SQLite packaging",
    required: true,
    rationale:
      "SQLite does not encrypt database files by default, so database encryption needs a compatible native library."
  },
  {
    id: "main-process-unlock-only",
    title: "Keep passphrases and derived keys out of renderer state",
    required: true,
    rationale:
      "The renderer must continue to use typed IPC and must never receive raw workspace encryption material."
  },
  {
    id: "attachment-envelope",
    title: "Encrypt attachment bytes separately from the database",
    required: true,
    rationale:
      "Database encryption does not cover files under the workspace attachments directory."
  },
  {
    id: "backup-export-policy",
    title: "Define encrypted backup, restore, and export behavior",
    required: true,
    rationale:
      "Backups and exports can otherwise become plaintext copies of an encrypted workspace."
  },
  {
    id: "recovery-and-rekey",
    title: "Design recovery-key, forgotten-passphrase, and rekey flows",
    required: true,
    rationale:
      "A local-only app cannot recover a lost passphrase through hosted accounts or support-side reset."
  },
  {
    id: "search-cache-audit",
    title: "Audit search, previews, temp files, and derived caches",
    required: true,
    rationale:
      "Search and preview data must not leak plaintext outside the encrypted database or attachment envelopes."
  },
  {
    id: "performance-benchmark",
    title: "Benchmark startup, search, backup, and attachment workflows",
    required: true,
    rationale:
      "Encryption overhead must be measured on realistic local workspace sizes before changing the production format."
  },
  {
    id: "cross-platform-keychain-qa",
    title: "Verify OS secret storage semantics on Windows, macOS, and Linux",
    required: true,
    rationale:
      "Convenience unlock depends on platform keychains whose availability and guarantees differ."
  }
];

export function isWorkspaceEncryptionMode(
  value: string
): value is WorkspaceEncryptionMode {
  return WORKSPACE_ENCRYPTION_MODES.includes(value as WorkspaceEncryptionMode);
}

export function isWorkspaceKeyStorageMode(
  value: string
): value is WorkspaceKeyStorageMode {
  return WORKSPACE_KEY_STORAGE_MODES.includes(value as WorkspaceKeyStorageMode);
}

export function createWorkspaceEncryptionPrototypePlan(
  input: WorkspaceEncryptionPrototypeInput
): WorkspaceEncryptionPrototypePlan {
  const risks: string[] = [];
  const followUps: string[] = [];

  if (input.mode === "disabled") {
    return {
      decision: "do-not-implement",
      summary:
        "Workspace encryption remains disabled; no schema, database format, attachment, backup, or export behavior changes are allowed.",
      gates: [],
      risks: ["User data remains protected only by local OS account and filesystem controls."],
      followUps: ["Keep documenting that the current workspace format is not encrypted at rest."]
    };
  }

  if (input.keyStorage === "unsupported") {
    risks.push("No supported key storage policy was selected.");
  }

  if (input.keyStorage === "os-secret-convenience-unlock") {
    risks.push(
      "OS secret storage can improve convenience but weakens portability and differs by platform; it must be optional, never the only recovery path."
    );
    followUps.push("Prototype passphrase unlock first, then add optional OS-wrapped convenience unlock.");
  }

  if (!input.encryptAttachments) {
    risks.push("Attachments would remain plaintext even if the SQLite database is encrypted.");
  }

  if (!input.encryptBackupsAndExports) {
    risks.push("Backup or export output could become a plaintext copy of encrypted workspace data.");
  }

  if (!input.preserveSearchIndexesInEncryptedDatabase) {
    risks.push("Search indexes or derived previews could leak plaintext outside the encrypted database.");
  }

  if (input.allowRendererKeyAccess) {
    risks.push("Renderer key access violates the Electron security boundary for native capabilities.");
  }

  followUps.push(
    "Build a throwaway SQLCipher packaging spike behind a non-production adapter.",
    "Draft follow-up implementation tickets for unlock UX, migration, attachments, backup/export, and recovery.",
    "Do not migrate existing production workspaces until all required gates pass."
  );

  return {
    decision: risks.length === 0 ? "candidate-for-implementation" : "prototype-only",
    summary:
      risks.length === 0
        ? "The proposed shape satisfies the known Local Work OS encryption gates, but still needs a dedicated implementation ticket and production migration approval."
        : "The proposed shape is suitable only for an experimental spike until the listed risks and required gates are resolved.",
    gates: requiredGates,
    risks,
    followUps
  };
}
