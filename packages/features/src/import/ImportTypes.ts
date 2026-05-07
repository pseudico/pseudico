export type ImportValidationSeverity = "error" | "warning";

export type ImportValidationIssue = {
  severity: ImportValidationSeverity;
  code: string;
  path: string;
  message: string;
};

export type ImportValidationCounts = {
  containers: number;
  containerTabs: number;
  items: number;
  taskDetails: number;
  noteDetails: number;
  listDetails: number;
  listItems: number;
  linkDetails: number;
  tags: number;
  taggings: number;
  categories: number;
  relationships: number;
  savedViews: number;
  dashboards: number;
  dashboardWidgets: number;
  dailyPlans: number;
  dailyPlanItems: number;
  attachments: number;
};

export type ImportValidationSummary = {
  valid: boolean;
  sourcePath: string | null;
  schemaVersion: number | null;
  exportedAt: string | null;
  workspace: {
    id: string;
    name: string;
    schemaVersion: number;
  } | null;
  counts: ImportValidationCounts;
  attachmentManifest: {
    attachmentCount: number;
    totalAttachmentBytes: number;
  } | null;
  targetPolicy: {
    mode: "new_workspace_only";
    canApplyToActiveWorkspace: false;
    message: string;
  };
  issues: ImportValidationIssue[];
};

