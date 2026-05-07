import type { FeatureModuleContract } from "../featureModuleContract";
import {
  WORKSPACE_EXPORT_SCHEMA_VERSION,
  type WorkspaceExportV1
} from "../export";
import type {
  ImportValidationCounts,
  ImportValidationIssue,
  ImportValidationSummary
} from "./ImportTypes";

export type ImportValidationFileSystemAdapter = {
  readTextFile: (filePath: string) => Promise<string>;
};

const emptyCounts: ImportValidationCounts = {
  containers: 0,
  containerTabs: 0,
  items: 0,
  taskDetails: 0,
  noteDetails: 0,
  listDetails: 0,
  listItems: 0,
  linkDetails: 0,
  tags: 0,
  taggings: 0,
  categories: 0,
  relationships: 0,
  savedViews: 0,
  dashboards: 0,
  dashboardWidgets: 0,
  dailyPlans: 0,
  dailyPlanItems: 0,
  attachments: 0
};

const dataArrayKeys = [
  "containers",
  "containerTabs",
  "items",
  "taskDetails",
  "noteDetails",
  "listDetails",
  "listItems",
  "linkDetails",
  "tags",
  "taggings",
  "categories",
  "relationships",
  "savedViews",
  "dashboards",
  "dashboardWidgets",
  "dailyPlans",
  "dailyPlanItems"
] as const;

type DataArrayKey = (typeof dataArrayKeys)[number];

export class ImportValidationService {
  readonly module = "import";

  private readonly fileSystem: ImportValidationFileSystemAdapter | undefined;

  constructor(input: { fileSystem?: ImportValidationFileSystemAdapter } = {}) {
    this.fileSystem = input.fileSystem;
  }

  async validateWorkspaceExportJson(
    filePath: string
  ): Promise<ImportValidationSummary> {
    validateNonEmptyString(filePath, "filePath");

    if (this.fileSystem === undefined) {
      throw new Error("Import validation file system adapter is required.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(await this.fileSystem.readTextFile(filePath));
    } catch (error) {
      return createSummary({
        sourcePath: filePath,
        exportData: null,
        issues: [
          {
            severity: "error",
            code: "invalid_json",
            path: "$",
            message:
              error instanceof SyntaxError
                ? "Import file must contain valid JSON."
                : error instanceof Error
                  ? error.message
                  : "Import file could not be read."
          }
        ]
      });
    }

    return this.validateWorkspaceExportData(parsed, filePath);
  }

  validateWorkspaceExportData(
    exportData: unknown,
    sourcePath: string | null = null
  ): ImportValidationSummary {
    const issues: ImportValidationIssue[] = [];

    if (!isRecord(exportData)) {
      issues.push({
        severity: "error",
        code: "invalid_schema",
        path: "$",
        message: "Workspace export must be a JSON object."
      });

      return createSummary({ sourcePath, exportData: null, issues });
    }

    validateSchemaShape(exportData, issues);

    if (issues.some((issue) => issue.severity === "error")) {
      return createSummary({ sourcePath, exportData, issues });
    }

    const typedExport = exportData as unknown as WorkspaceExportV1;

    issues.push(...this.validateExportReferences(typedExport));
    issues.push(...validateAttachmentManifest(typedExport));

    return createSummary({
      sourcePath,
      exportData: typedExport,
      issues
    });
  }

  validateExportReferences(exportData: WorkspaceExportV1): ImportValidationIssue[] {
    const issues: ImportValidationIssue[] = [];
    const workspaceId = exportData.workspace.id;
    const containers = toRecordArray(exportData.data.containers);
    const containerTabs = toRecordArray(exportData.data.containerTabs);
    const items = toRecordArray(exportData.data.items);
    const taskDetails = toRecordArray(exportData.data.taskDetails);
    const noteDetails = toRecordArray(exportData.data.noteDetails);
    const listDetails = toRecordArray(exportData.data.listDetails);
    const listItems = toRecordArray(exportData.data.listItems);
    const linkDetails = toRecordArray(exportData.data.linkDetails);
    const tags = toRecordArray(exportData.data.tags);
    const taggings = toRecordArray(exportData.data.taggings);
    const categories = toRecordArray(exportData.data.categories);
    const relationships = toRecordArray(exportData.data.relationships);
    const savedViews = toRecordArray(exportData.data.savedViews);
    const dashboards = toRecordArray(exportData.data.dashboards);
    const dashboardWidgets = toRecordArray(exportData.data.dashboardWidgets);
    const dailyPlans = toRecordArray(exportData.data.dailyPlans);
    const dailyPlanItems = toRecordArray(exportData.data.dailyPlanItems);
    const attachments = toRecordArray(exportData.attachmentManifest.attachments);

    const containerIds = collectIds(containers, "$.data.containers", issues);
    const containerTabIds = collectIds(
      containerTabs,
      "$.data.containerTabs",
      issues
    );
    const itemIds = collectIds(items, "$.data.items", issues);
    const listItemIds = collectIds(listItems, "$.data.listItems", issues);
    const tagIds = collectIds(tags, "$.data.tags", issues);
    const categoryIds = collectIds(categories, "$.data.categories", issues);
    const savedViewIds = collectIds(savedViews, "$.data.savedViews", issues);
    const dashboardIds = collectIds(dashboards, "$.data.dashboards", issues);
    const dailyPlanIds = collectIds(dailyPlans, "$.data.dailyPlans", issues);

    collectIds(taggings, "$.data.taggings", issues);
    collectIds(relationships, "$.data.relationships", issues);
    collectIds(dashboardWidgets, "$.data.dashboardWidgets", issues);
    collectIds(dailyPlanItems, "$.data.dailyPlanItems", issues);
    collectIds(attachments, "$.attachmentManifest.attachments", issues);
    collectUniqueForeignIds(taskDetails, "$.data.taskDetails", "itemId", issues);
    collectUniqueForeignIds(noteDetails, "$.data.noteDetails", "itemId", issues);
    collectUniqueForeignIds(listDetails, "$.data.listDetails", "itemId", issues);
    collectUniqueForeignIds(linkDetails, "$.data.linkDetails", "itemId", issues);

    for (const [key, records] of Object.entries(exportData.data)) {
      if (Array.isArray(records)) {
        validateWorkspaceIds(
          toRecordArray(records),
          `$.data.${key}`,
          workspaceId,
          issues
        );
      }
    }

    for (const [index, container] of containers.entries()) {
      validateOptionalReference({
        value: container.categoryId,
        ids: categoryIds,
        path: `$.data.containers[${index}].categoryId`,
        targetName: "category",
        issues
      });
    }

    for (const [index, tab] of containerTabs.entries()) {
      validateRequiredReference({
        value: tab.containerId,
        ids: containerIds,
        path: `$.data.containerTabs[${index}].containerId`,
        targetName: "container",
        issues
      });
    }

    for (const [index, item] of items.entries()) {
      validateRequiredReference({
        value: item.containerId,
        ids: containerIds,
        path: `$.data.items[${index}].containerId`,
        targetName: "container",
        issues
      });
      validateOptionalReference({
        value: item.containerTabId,
        ids: containerTabIds,
        path: `$.data.items[${index}].containerTabId`,
        targetName: "container tab",
        issues
      });
      validateOptionalReference({
        value: item.categoryId,
        ids: categoryIds,
        path: `$.data.items[${index}].categoryId`,
        targetName: "category",
        issues
      });
    }

    validateDetailsReference(taskDetails, "taskDetails", "task", itemIds, items, issues);
    validateDetailsReference(noteDetails, "noteDetails", "note", itemIds, items, issues);
    validateDetailsReference(listDetails, "listDetails", "list", itemIds, items, issues);
    validateDetailsReference(linkDetails, "linkDetails", "link", itemIds, items, issues);

    for (const [index, listItem] of listItems.entries()) {
      validateRequiredReference({
        value: listItem.listId,
        ids: itemIds,
        path: `$.data.listItems[${index}].listId`,
        targetName: "list item",
        issues
      });
      validateOptionalReference({
        value: listItem.listItemParentId,
        ids: listItemIds,
        path: `$.data.listItems[${index}].listItemParentId`,
        targetName: "parent list item",
        issues
      });
    }

    for (const [index, tagging] of taggings.entries()) {
      validateRequiredReference({
        value: tagging.tagId,
        ids: tagIds,
        path: `$.data.taggings[${index}].tagId`,
        targetName: "tag",
        issues
      });
      validateTypedTargetReference({
        targetType: tagging.targetType,
        targetId: tagging.targetId,
        path: `$.data.taggings[${index}]`,
        idsByType: { container: containerIds, item: itemIds, list_item: listItemIds },
        issues
      });
    }

    for (const [index, relationship] of relationships.entries()) {
      validateTypedTargetReference({
        targetType: relationship.sourceType,
        targetId: relationship.sourceId,
        path: `$.data.relationships[${index}].source`,
        idsByType: { container: containerIds, item: itemIds, list_item: listItemIds },
        issues
      });
      validateTypedTargetReference({
        targetType: relationship.targetType,
        targetId: relationship.targetId,
        path: `$.data.relationships[${index}].target`,
        idsByType: { container: containerIds, item: itemIds, list_item: listItemIds },
        issues
      });
    }

    for (const [index, widget] of dashboardWidgets.entries()) {
      validateRequiredReference({
        value: widget.dashboardId,
        ids: dashboardIds,
        path: `$.data.dashboardWidgets[${index}].dashboardId`,
        targetName: "dashboard",
        issues
      });
      validateOptionalReference({
        value: widget.savedViewId,
        ids: savedViewIds,
        path: `$.data.dashboardWidgets[${index}].savedViewId`,
        targetName: "saved view",
        issues
      });
    }

    for (const [index, planItem] of dailyPlanItems.entries()) {
      validateRequiredReference({
        value: planItem.dailyPlanId,
        ids: dailyPlanIds,
        path: `$.data.dailyPlanItems[${index}].dailyPlanId`,
        targetName: "daily plan",
        issues
      });
      validateTypedTargetReference({
        targetType: planItem.itemType,
        targetId: planItem.itemId,
        path: `$.data.dailyPlanItems[${index}]`,
        idsByType: { task: itemIds, item: itemIds },
        issues
      });
    }

    return issues;
  }

  summariseImport(exportData: WorkspaceExportV1): ImportValidationSummary {
    return createSummary({
      sourcePath: null,
      exportData,
      issues: [
        ...this.validateExportReferences(exportData),
        ...validateAttachmentManifest(exportData)
      ]
    });
  }
}

export const importModuleContract = {
  module: "import",
  purpose: "Validate local workspace JSON exports before future new-workspace import.",
  owns: ["import validation", "export reference diagnostics", "new-workspace import summary"],
  doesNotOwn: ["active workspace restore", "cloud import", "direct renderer filesystem reads"],
  integrationPoints: ["workspace", "export", "Electron main/preload IPC"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateSchemaShape(
  exportData: Record<string, unknown>,
  issues: ImportValidationIssue[]
): void {
  if (exportData.schemaVersion !== WORKSPACE_EXPORT_SCHEMA_VERSION) {
    issues.push({
      severity: "error",
      code: "unsupported_schema_version",
      path: "$.schemaVersion",
      message: `Workspace export schemaVersion must be ${WORKSPACE_EXPORT_SCHEMA_VERSION}.`
    });
  }

  if (!isNonEmptyString(exportData.exportedAt)) {
    issues.push({
      severity: "error",
      code: "missing_exported_at",
      path: "$.exportedAt",
      message: "Workspace export must include exportedAt."
    });
  }

  if (!isRecord(exportData.workspace)) {
    issues.push({
      severity: "error",
      code: "missing_workspace",
      path: "$.workspace",
      message: "Workspace export must include workspace metadata."
    });
  } else {
    requireString(exportData.workspace, "id", "$.workspace.id", issues);
    requireString(exportData.workspace, "name", "$.workspace.name", issues);
    requireNumber(
      exportData.workspace,
      "schemaVersion",
      "$.workspace.schemaVersion",
      issues
    );
  }

  if (!isRecord(exportData.data)) {
    issues.push({
      severity: "error",
      code: "missing_data",
      path: "$.data",
      message: "Workspace export must include data arrays."
    });
  } else {
    for (const key of dataArrayKeys) {
      if (!Array.isArray(exportData.data[key])) {
        issues.push({
          severity: "error",
          code: "missing_data_array",
          path: `$.data.${key}`,
          message: `${key} must be an array.`
        });
      } else {
        validateArrayRecords(exportData.data[key], `$.data.${key}`, issues);
      }
    }
  }

  if (!isRecord(exportData.attachmentManifest)) {
    issues.push({
      severity: "error",
      code: "missing_attachment_manifest",
      path: "$.attachmentManifest",
      message: "Workspace export must include an attachment manifest."
    });
  } else {
    if (!Array.isArray(exportData.attachmentManifest.attachments)) {
      issues.push({
        severity: "error",
        code: "missing_attachment_array",
        path: "$.attachmentManifest.attachments",
        message: "Attachment manifest attachments must be an array."
      });
    } else {
      validateArrayRecords(
        exportData.attachmentManifest.attachments,
        "$.attachmentManifest.attachments",
        issues
      );
    }
    requireNumber(
      exportData.attachmentManifest,
      "attachmentCount",
      "$.attachmentManifest.attachmentCount",
      issues
    );
    requireNumber(
      exportData.attachmentManifest,
      "totalAttachmentBytes",
      "$.attachmentManifest.totalAttachmentBytes",
      issues
    );
  }
}

function validateArrayRecords(
  records: unknown[],
  path: string,
  issues: ImportValidationIssue[]
): void {
  for (const [index, record] of records.entries()) {
    if (!isRecord(record)) {
      issues.push({
        severity: "error",
        code: "invalid_row",
        path: `${path}[${index}]`,
        message: "Export rows must be JSON objects."
      });
    }
  }
}

function validateAttachmentManifest(
  exportData: WorkspaceExportV1
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  const attachments = toRecordArray(exportData.attachmentManifest.attachments);
  const itemIds = new Set(
    toRecordArray(exportData.data.items)
      .map((item) => item.id)
      .filter(isNonEmptyString)
  );
  const expectedTotalBytes = attachments.reduce(
    (total, attachment) =>
      total + (typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : 0),
    0
  );

  if (exportData.attachmentManifest.attachmentCount !== attachments.length) {
    issues.push({
      severity: "error",
      code: "attachment_count_mismatch",
      path: "$.attachmentManifest.attachmentCount",
      message: "Attachment manifest count must match the attachment entries."
    });
  }

  if (exportData.attachmentManifest.totalAttachmentBytes !== expectedTotalBytes) {
    issues.push({
      severity: "error",
      code: "attachment_total_mismatch",
      path: "$.attachmentManifest.totalAttachmentBytes",
      message: "Attachment manifest total bytes must match the attachment entries."
    });
  }

  for (const [index, attachment] of attachments.entries()) {
    const path = `$.attachmentManifest.attachments[${index}]`;
    requireString(attachment, "id", `${path}.id`, issues);
    requireString(attachment, "itemId", `${path}.itemId`, issues);
    requireString(attachment, "originalName", `${path}.originalName`, issues);
    requireString(attachment, "storedName", `${path}.storedName`, issues);
    requireNumber(attachment, "sizeBytes", `${path}.sizeBytes`, issues);
    requireString(attachment, "storagePath", `${path}.storagePath`, issues);

    validateRequiredReference({
      value: attachment.itemId,
      ids: itemIds,
      path: `${path}.itemId`,
      targetName: "item",
      issues
    });

    if (
      isNonEmptyString(attachment.storagePath) &&
      !isWorkspaceRelativeAttachmentPath(attachment.storagePath)
    ) {
      issues.push({
        severity: "error",
        code: "unsafe_attachment_path",
        path: `${path}.storagePath`,
        message: "Attachment storagePath must stay inside workspace attachments."
      });
    }

    if (typeof attachment.sizeBytes === "number" && attachment.sizeBytes < 0) {
      issues.push({
        severity: "error",
        code: "negative_attachment_size",
        path: `${path}.sizeBytes`,
        message: "Attachment sizeBytes cannot be negative."
      });
    }
  }

  return issues;
}

function createSummary(input: {
  sourcePath: string | null;
  exportData: Record<string, unknown> | WorkspaceExportV1 | null;
  issues: ImportValidationIssue[];
}): ImportValidationSummary {
  const exportData = input.exportData;
  const data = isRecord(exportData?.data) ? exportData.data : null;
  const manifest = isRecord(exportData?.attachmentManifest)
    ? exportData.attachmentManifest
    : null;
  const workspace = isRecord(exportData?.workspace) ? exportData.workspace : null;

  return {
    valid: input.issues.every((issue) => issue.severity !== "error"),
    sourcePath: input.sourcePath,
    schemaVersion:
      typeof exportData?.schemaVersion === "number"
        ? exportData.schemaVersion
        : null,
    exportedAt: isNonEmptyString(exportData?.exportedAt)
      ? exportData.exportedAt
      : null,
    workspace:
      workspace !== null &&
      isNonEmptyString(workspace.id) &&
      isNonEmptyString(workspace.name) &&
      typeof workspace.schemaVersion === "number"
        ? {
            id: workspace.id,
            name: workspace.name,
            schemaVersion: workspace.schemaVersion
          }
        : null,
    counts: countData(data, manifest),
    attachmentManifest:
      manifest !== null &&
      typeof manifest.attachmentCount === "number" &&
      typeof manifest.totalAttachmentBytes === "number"
        ? {
            attachmentCount: manifest.attachmentCount,
            totalAttachmentBytes: manifest.totalAttachmentBytes
          }
        : null,
    targetPolicy: {
      mode: "new_workspace_only",
      canApplyToActiveWorkspace: false,
      message:
        "Validation only. A valid export may be imported into a new workspace in a later apply step; the active workspace is not modified."
    },
    issues: input.issues
  };
}

function countData(
  data: Record<string, unknown> | null,
  manifest: Record<string, unknown> | null
): ImportValidationCounts {
  if (data === null) {
    return { ...emptyCounts };
  }

  return {
    containers: countArray(data.containers),
    containerTabs: countArray(data.containerTabs),
    items: countArray(data.items),
    taskDetails: countArray(data.taskDetails),
    noteDetails: countArray(data.noteDetails),
    listDetails: countArray(data.listDetails),
    listItems: countArray(data.listItems),
    linkDetails: countArray(data.linkDetails),
    tags: countArray(data.tags),
    taggings: countArray(data.taggings),
    categories: countArray(data.categories),
    relationships: countArray(data.relationships),
    savedViews: countArray(data.savedViews),
    dashboards: countArray(data.dashboards),
    dashboardWidgets: countArray(data.dashboardWidgets),
    dailyPlans: countArray(data.dailyPlans),
    dailyPlanItems: countArray(data.dailyPlanItems),
    attachments: countArray(manifest?.attachments)
  };
}

function validateDetailsReference(
  details: Array<Record<string, unknown>>,
  key: DataArrayKey,
  expectedItemType: string,
  itemIds: Set<string>,
  items: Array<Record<string, unknown>>,
  issues: ImportValidationIssue[]
): void {
  const typeByItemId = new Map(
    items
      .filter((item) => isNonEmptyString(item.id))
      .map((item) => [item.id as string, item.type])
  );

  for (const [index, detail] of details.entries()) {
    validateRequiredReference({
      value: detail.itemId,
      ids: itemIds,
      path: `$.data.${key}[${index}].itemId`,
      targetName: "item",
      issues
    });

    if (
      isNonEmptyString(detail.itemId) &&
      typeByItemId.get(detail.itemId) !== expectedItemType
    ) {
      issues.push({
        severity: "error",
        code: "wrong_item_detail_type",
        path: `$.data.${key}[${index}].itemId`,
        message: `${key} row must reference an item of type ${expectedItemType}.`
      });
    }
  }
}

function validateWorkspaceIds(
  records: Array<Record<string, unknown>>,
  path: string,
  workspaceId: string,
  issues: ImportValidationIssue[]
): void {
  for (const [index, record] of records.entries()) {
    if (record.workspaceId !== workspaceId) {
      issues.push({
        severity: "error",
        code: "workspace_id_mismatch",
        path: `${path}[${index}].workspaceId`,
        message: "Export rows must all belong to the exported workspace."
      });
    }
  }
}

function collectIds(
  records: Array<Record<string, unknown>>,
  path: string,
  issues: ImportValidationIssue[]
): Set<string> {
  const ids = new Set<string>();

  for (const [index, record] of records.entries()) {
    if (!isNonEmptyString(record.id)) {
      issues.push({
        severity: "error",
        code: "missing_id",
        path: `${path}[${index}].id`,
        message: "Required id is missing."
      });
      continue;
    }

    if (ids.has(record.id)) {
      issues.push({
        severity: "error",
        code: "duplicate_id",
        path: `${path}[${index}].id`,
        message: `Duplicate id ${record.id}.`
      });
    }

    ids.add(record.id);
  }

  return ids;
}

function collectUniqueForeignIds(
  records: Array<Record<string, unknown>>,
  path: string,
  fieldName: string,
  issues: ImportValidationIssue[]
): Set<string> {
  const ids = new Set<string>();

  for (const [index, record] of records.entries()) {
    const value = record[fieldName];

    if (!isNonEmptyString(value)) {
      issues.push({
        severity: "error",
        code: "missing_id",
        path: `${path}[${index}].${fieldName}`,
        message: `Required ${fieldName} is missing.`
      });
      continue;
    }

    if (ids.has(value)) {
      issues.push({
        severity: "error",
        code: "duplicate_id",
        path: `${path}[${index}].${fieldName}`,
        message: `Duplicate ${fieldName} ${value}.`
      });
    }

    ids.add(value);
  }

  return ids;
}

function validateRequiredReference(input: {
  value: unknown;
  ids: Set<string>;
  path: string;
  targetName: string;
  issues: ImportValidationIssue[];
}): void {
  if (!isNonEmptyString(input.value) || !input.ids.has(input.value)) {
    input.issues.push({
      severity: "error",
      code: "missing_reference",
      path: input.path,
      message: `Referenced ${input.targetName} was not found.`
    });
  }
}

function validateOptionalReference(input: {
  value: unknown;
  ids: Set<string>;
  path: string;
  targetName: string;
  issues: ImportValidationIssue[];
}): void {
  if (
    input.value !== null &&
    input.value !== undefined &&
    (!isNonEmptyString(input.value) || !input.ids.has(input.value))
  ) {
    input.issues.push({
      severity: "error",
      code: "missing_reference",
      path: input.path,
      message: `Referenced ${input.targetName} was not found.`
    });
  }
}

function validateTypedTargetReference(input: {
  targetType: unknown;
  targetId: unknown;
  path: string;
  idsByType: Record<string, Set<string>>;
  issues: ImportValidationIssue[];
}): void {
  if (!isNonEmptyString(input.targetType) || !isNonEmptyString(input.targetId)) {
    input.issues.push({
      severity: "error",
      code: "missing_reference",
      path: input.path,
      message: "Typed reference must include target type and id."
    });
    return;
  }

  const ids = input.idsByType[input.targetType];

  if (ids === undefined || !ids.has(input.targetId)) {
    input.issues.push({
      severity: "error",
      code: "missing_reference",
      path: input.path,
      message: `Referenced ${input.targetType} target was not found.`
    });
  }
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ImportValidationIssue[]
): void {
  if (!isNonEmptyString(record[key])) {
    issues.push({
      severity: "error",
      code: "missing_required_field",
      path,
      message: `${key} must be a non-empty string.`
    });
  }
}

function requireNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ImportValidationIssue[]
): void {
  if (typeof record[key] !== "number" || Number.isNaN(record[key])) {
    issues.push({
      severity: "error",
      code: "missing_required_field",
      path,
      message: `${key} must be a number.`
    });
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isWorkspaceRelativeAttachmentPath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");

  return (
    normalized.startsWith("attachments/") &&
    !normalized.startsWith("/") &&
    !/^[a-zA-Z]:/.test(normalized) &&
    normalized.split("/").every((segment) => segment !== "." && segment !== "..")
  );
}

function toRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
