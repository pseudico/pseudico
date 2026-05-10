import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  CategoryRepository,
  TemplateRepository,
  type CategoryRecord,
  type DatabaseConnection,
  type TemplateRecord
} from "@local-work-os/db";
import {
  TEMPLATE_JSON_VERSION,
  validateTemplateJson,
  type TemplateContainerItemJsonV1,
  type TemplateJsonV1,
  type TemplateKind,
  type TemplateListItemJsonV1,
  type TemplateTagRef
} from "./TemplateService";

export const LWO_TEMPLATE_FILE_TYPE = "local-work-os.template";
export const LWO_TEMPLATE_FILE_VERSION = 1;
export const LWO_TEMPLATE_FILE_EXTENSION = ".lwo-template";

export type TemplateFileCategoryRef = {
  categoryId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
};

export type TemplateFileCapabilities = {
  tabs: boolean;
  tasks: boolean;
  notes: boolean;
  lists: boolean;
  links: boolean;
  filePlaceholders: boolean;
  tags: boolean;
  categories: boolean;
  relativeDates: boolean;
  contactFields: boolean;
};

export type TemplateFileV1 = {
  fileType: typeof LWO_TEMPLATE_FILE_TYPE;
  fileVersion: typeof LWO_TEMPLATE_FILE_VERSION;
  exportedAt: string;
  source: {
    app: "Local Work OS";
    workspaceId: string | null;
    templateId: string | null;
    sourceType: TemplateKind;
    sourceId: string | null;
  };
  metadata: {
    name: string;
    description: string | null;
    kind: TemplateKind;
    templateJsonVersion: typeof TEMPLATE_JSON_VERSION;
    recommendedExtension: typeof LWO_TEMPLATE_FILE_EXTENSION;
  };
  capabilities: TemplateFileCapabilities;
  references: {
    tags: TemplateTagRef[];
    categories: TemplateFileCategoryRef[];
  };
  template: TemplateJsonV1;
};

export type TemplateExportFileSystemAdapter = {
  writeTemplateFile?: (input: {
    exportRelativePath: string;
    contents: string;
  }) => Promise<{ sizeBytes: number }>;
  writeTextExport?: (input: {
    exportRelativePath: string;
    contents: string;
  }) => Promise<{ sizeBytes: number }>;
};

export type TemplateExportServiceIdFactory = (prefix: string) => string;

export type BuildTemplateFileInput = {
  templateId: string;
};

export type WriteTemplateFileInput = {
  exportRelativePath: string;
  templateFile: TemplateFileV1;
};

export type ExportTemplateFileInput = BuildTemplateFileInput & {
  exportRelativePath?: string;
  actorType?: ActivityActorType;
};

export type TemplateFileExportResult = {
  id: string;
  workspaceId: string;
  templateId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  fileVersion: typeof LWO_TEMPLATE_FILE_VERSION;
  kind: TemplateKind;
  name: string;
};

export type TemplateImportValidationSeverity = "error" | "warning";

export type TemplateImportValidationIssue = {
  severity: TemplateImportValidationSeverity;
  code: string;
  path: string;
  message: string;
};

export type TemplateImportValidationCounts = {
  tabs: number;
  items: number;
  tasks: number;
  notes: number;
  lists: number;
  links: number;
  filePlaceholders: number;
  listItems: number;
  tags: number;
  categories: number;
};

export type TemplateImportValidationSummary = {
  valid: boolean;
  sourcePath: string | null;
  fileVersion: number | null;
  exportedAt: string | null;
  kind: TemplateKind | null;
  name: string | null;
  description: string | null;
  template: TemplateJsonV1 | null;
  capabilities: TemplateFileCapabilities | null;
  counts: TemplateImportValidationCounts;
  issues: TemplateImportValidationIssue[];
};

export type TemplateImportValidatorFileSystemAdapter = {
  readTextFile: (filePath: string) => Promise<string>;
};

export class TemplateExportService {
  readonly module = "templates";

  private readonly connection: DatabaseConnection;
  private readonly fileSystem: TemplateExportFileSystemAdapter;
  private readonly idFactory: TemplateExportServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    fileSystem?: TemplateExportFileSystemAdapter;
    idFactory?: TemplateExportServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.fileSystem = input.fileSystem ?? {};
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  buildTemplateFile(input: BuildTemplateFileInput): TemplateFileV1 {
    validateNonEmptyString(input.templateId, "templateId");

    const template = new TemplateRepository(this.connection).getById(input.templateId);

    if (template === null) {
      throw new Error(`Template row was not found: ${input.templateId}.`);
    }

    return this.buildTemplateFileFromRecord(template);
  }

  buildTemplateFileFromRecord(template: TemplateRecord): TemplateFileV1 {
    const templateJson = validateTemplateJson(JSON.parse(template.templateJson));

    if (templateJson.kind !== template.kind) {
      throw new Error("Template row kind must match template JSON kind.");
    }

    const references = collectTemplateReferences(
      templateJson,
      new CategoryRepository(this.connection)
    );

    return {
      fileType: LWO_TEMPLATE_FILE_TYPE,
      fileVersion: LWO_TEMPLATE_FILE_VERSION,
      exportedAt: createIsoTimestamp(this.now()),
      source: {
        app: "Local Work OS",
        workspaceId: template.workspaceId,
        templateId: template.id,
        sourceType: template.sourceType,
        sourceId: template.sourceId
      },
      metadata: {
        name: template.name,
        description: template.description,
        kind: template.kind,
        templateJsonVersion: TEMPLATE_JSON_VERSION,
        recommendedExtension: LWO_TEMPLATE_FILE_EXTENSION
      },
      capabilities: deriveCapabilities(templateJson),
      references: {
        tags: references.tags,
        categories: references.categories
      },
      template: templateJson
    };
  }

  async writeTemplateFile(input: WriteTemplateFileInput): Promise<{
    relativePath: string;
    sizeBytes: number;
  }> {
    validateTemplateExportRelativePath(input.exportRelativePath, "exportRelativePath");
    const summary = new TemplateImportValidator().validateTemplateFileData(input.templateFile);

    if (!summary.valid) {
      const firstError = summary.issues.find((issue) => issue.severity === "error");
      throw new Error(firstError?.message ?? "Template file data is not valid.");
    }

    const writeTemplateFile =
      this.fileSystem.writeTemplateFile ?? this.fileSystem.writeTextExport;

    if (writeTemplateFile === undefined) {
      throw new Error("Template export file system adapter cannot write template files.");
    }

    const written = await writeTemplateFile({
      exportRelativePath: input.exportRelativePath,
      contents: `${JSON.stringify(input.templateFile, null, 2)}\n`
    });

    return {
      relativePath: input.exportRelativePath,
      sizeBytes: written.sizeBytes
    };
  }

  async exportTemplateFile(input: ExportTemplateFileInput): Promise<TemplateFileExportResult> {
    const templateFile = this.buildTemplateFile({ templateId: input.templateId });
    const exportId = this.idFactory("export");
    const relativePath =
      input.exportRelativePath ??
      createTemplateExportRelativePath(templateFile.exportedAt, templateFile.metadata.name);
    const written = await this.writeTemplateFile({
      exportRelativePath: relativePath,
      templateFile
    });

    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: templateFile.source.workspaceId ?? "",
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.exportCreated,
      targetType: "export",
      targetId: exportId,
      summary: `Created template export ${written.relativePath}.`,
      beforeJson: null,
      afterJson: JSON.stringify({
        export: {
          id: exportId,
          kind: "template_file",
          relativePath: written.relativePath,
          sizeBytes: written.sizeBytes,
          templateId: input.templateId,
          templateKind: templateFile.metadata.kind,
          fileVersion: templateFile.fileVersion
        }
      }),
      timestamp: templateFile.exportedAt
    });

    return {
      id: exportId,
      workspaceId: templateFile.source.workspaceId ?? "",
      templateId: input.templateId,
      createdAt: templateFile.exportedAt,
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      fileVersion: templateFile.fileVersion,
      kind: templateFile.metadata.kind,
      name: templateFile.metadata.name
    };
  }
}

export class TemplateImportValidator {
  readonly module = "templates";

  private readonly fileSystem: TemplateImportValidatorFileSystemAdapter | undefined;

  constructor(input: { fileSystem?: TemplateImportValidatorFileSystemAdapter } = {}) {
    this.fileSystem = input.fileSystem;
  }

  async validateTemplateFile(filePath: string): Promise<TemplateImportValidationSummary> {
    validateNonEmptyString(filePath, "filePath");

    if (!filePath.endsWith(LWO_TEMPLATE_FILE_EXTENSION)) {
      return createValidationSummary({
        sourcePath: filePath,
        fileData: null,
        template: null,
        issues: [
          {
            severity: "error",
            code: "invalid_extension",
            path: "$",
            message: `Template files must use the ${LWO_TEMPLATE_FILE_EXTENSION} extension.`
          }
        ]
      });
    }

    if (this.fileSystem === undefined) {
      throw new Error("Template import validator file system adapter is required.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(await this.fileSystem.readTextFile(filePath));
    } catch (error) {
      return createValidationSummary({
        sourcePath: filePath,
        fileData: null,
        template: null,
        issues: [
          {
            severity: "error",
            code: "invalid_json",
            path: "$",
            message:
              error instanceof SyntaxError
                ? "Template file must contain valid JSON."
                : error instanceof Error
                  ? error.message
                  : "Template file could not be read."
          }
        ]
      });
    }

    return this.validateTemplateFileData(parsed, filePath);
  }

  validateTemplateFileData(
    fileData: unknown,
    sourcePath: string | null = null
  ): TemplateImportValidationSummary {
    const issues: TemplateImportValidationIssue[] = [];

    if (!isRecord(fileData)) {
      issues.push({
        severity: "error",
        code: "invalid_schema",
        path: "$",
        message: "Template file must be a JSON object."
      });

      return createValidationSummary({ sourcePath, fileData: null, template: null, issues });
    }

    validateEnvelopeShape(fileData, issues);

    let template: TemplateJsonV1 | null = null;

    if (isRecord(fileData.template)) {
      try {
        template = validateTemplateJson(fileData.template);
      } catch (error) {
        issues.push({
          severity: "error",
          code: "invalid_template_payload",
          path: "$.template",
          message: error instanceof Error ? error.message : "Template payload is invalid."
        });
      }
    }

    if (template !== null) {
      validateEnvelopeReferences(fileData, template, issues);
    }

    return createValidationSummary({
      sourcePath,
      fileData,
      template,
      issues
    });
  }
}

export function deriveCapabilities(template: TemplateJsonV1): TemplateFileCapabilities {
  if (template.kind === "list") {
    const listItems = template.list.items;

    return {
      tabs: false,
      tasks: false,
      notes: false,
      lists: true,
      links: false,
      filePlaceholders: false,
      tags: hasTags([template.list.tags, ...listItems.map((item) => item.tags)]),
      categories: template.list.categoryId !== null,
      relativeDates: listItems.some(hasRelativeDate),
      contactFields: false
    };
  }

  const items = template.container.items;

  return {
    tabs: template.container.tabs.length > 0,
    tasks: items.some((item) => item.type === "task"),
    notes: items.some((item) => item.type === "note"),
    lists: items.some((item) => item.type === "list"),
    links: items.some((item) => item.type === "link"),
    filePlaceholders: items.some((item) => item.type === "file"),
    tags: hasTags([
      template.container.tags,
      ...items.map((item) => item.tags),
      ...items.flatMap((item) => item.list?.items.map((listItem) => listItem.tags) ?? [])
    ]),
    categories:
      template.container.categoryId !== null || items.some((item) => item.categoryId !== null),
    relativeDates:
      items.some(hasRelativeDate) ||
      items.some((item) => item.list?.items.some(hasRelativeDate) ?? false),
    contactFields: template.container.contactFields.length > 0
  };
}

function validateEnvelopeShape(
  fileData: Record<string, unknown>,
  issues: TemplateImportValidationIssue[]
): void {
  if (fileData.fileType !== LWO_TEMPLATE_FILE_TYPE) {
    issues.push({
      severity: "error",
      code: "invalid_file_type",
      path: "$.fileType",
      message: `Template fileType must be ${LWO_TEMPLATE_FILE_TYPE}.`
    });
  }

  if (fileData.fileVersion !== LWO_TEMPLATE_FILE_VERSION) {
    issues.push({
      severity: "error",
      code: "unsupported_file_version",
      path: "$.fileVersion",
      message: `Template fileVersion must be ${LWO_TEMPLATE_FILE_VERSION}.`
    });
  }

  requireString(fileData, "exportedAt", "$.exportedAt", issues);

  if (!isRecord(fileData.source)) {
    issues.push({
      severity: "error",
      code: "missing_source",
      path: "$.source",
      message: "Template file must include source metadata."
    });
  } else {
    requireString(fileData.source, "app", "$.source.app", issues);
    if (fileData.source.app !== "Local Work OS") {
      issues.push({
        severity: "error",
        code: "invalid_source_app",
        path: "$.source.app",
        message: "source.app must be Local Work OS."
      });
    }
    requireString(fileData.source, "sourceType", "$.source.sourceType", issues);
    requireOptionalNullableString(fileData.source, "workspaceId", "$.source.workspaceId", issues);
    requireOptionalNullableString(fileData.source, "templateId", "$.source.templateId", issues);
    requireOptionalNullableString(fileData.source, "sourceId", "$.source.sourceId", issues);
  }

  if (!isRecord(fileData.metadata)) {
    issues.push({
      severity: "error",
      code: "missing_metadata",
      path: "$.metadata",
      message: "Template file must include metadata."
    });
  } else {
    requireString(fileData.metadata, "name", "$.metadata.name", issues);
    requireOptionalNullableString(fileData.metadata, "description", "$.metadata.description", issues);
    requireString(fileData.metadata, "kind", "$.metadata.kind", issues);

    if (fileData.metadata.templateJsonVersion !== TEMPLATE_JSON_VERSION) {
      issues.push({
        severity: "error",
        code: "unsupported_template_json_version",
        path: "$.metadata.templateJsonVersion",
        message: `Template JSON version must be ${TEMPLATE_JSON_VERSION}.`
      });
    }

    if (fileData.metadata.recommendedExtension !== LWO_TEMPLATE_FILE_EXTENSION) {
      issues.push({
        severity: "error",
        code: "invalid_recommended_extension",
        path: "$.metadata.recommendedExtension",
        message: `recommendedExtension must be ${LWO_TEMPLATE_FILE_EXTENSION}.`
      });
    }
  }

  if (!isRecord(fileData.capabilities)) {
    issues.push({
      severity: "error",
      code: "missing_capabilities",
      path: "$.capabilities",
      message: "Template file must include capability flags."
    });
  } else {
    for (const key of capabilityKeys) {
      if (typeof fileData.capabilities[key] !== "boolean") {
        issues.push({
          severity: "error",
          code: "invalid_capability",
          path: `$.capabilities.${key}`,
          message: `${key} capability must be a boolean.`
        });
      }
    }
  }

  if (!isRecord(fileData.references)) {
    issues.push({
      severity: "error",
      code: "missing_references",
      path: "$.references",
      message: "Template file must include portable references."
    });
  } else {
    if (!Array.isArray(fileData.references.tags)) {
      issues.push({
        severity: "error",
        code: "invalid_tag_references",
        path: "$.references.tags",
        message: "references.tags must be an array."
      });
    } else {
      fileData.references.tags.forEach((tag, index) => {
        validateTagReference(tag, `$.references.tags[${index}]`, issues);
      });
    }

    if (!Array.isArray(fileData.references.categories)) {
      issues.push({
        severity: "error",
        code: "invalid_category_references",
        path: "$.references.categories",
        message: "references.categories must be an array."
      });
    } else {
      fileData.references.categories.forEach((category, index) => {
        validateCategoryReference(category, `$.references.categories[${index}]`, issues);
      });
    }
  }

  if (!isRecord(fileData.template)) {
    issues.push({
      severity: "error",
      code: "missing_template",
      path: "$.template",
      message: "Template file must include a template payload."
    });
  }
}

function validateEnvelopeReferences(
  fileData: Record<string, unknown>,
  template: TemplateJsonV1,
  issues: TemplateImportValidationIssue[]
): void {
  const metadataKind = isRecord(fileData.metadata) ? fileData.metadata.kind : null;
  const sourceType = isRecord(fileData.source) ? fileData.source.sourceType : null;

  if (metadataKind !== template.kind) {
    issues.push({
      severity: "error",
      code: "kind_mismatch",
      path: "$.metadata.kind",
      message: "metadata.kind must match template.kind."
    });
  }

  if (sourceType !== template.kind) {
    issues.push({
      severity: "error",
      code: "source_kind_mismatch",
      path: "$.source.sourceType",
      message: "source.sourceType must match template.kind."
    });
  }

  if (!isRecord(fileData.references)) {
    return;
  }

  const collected = collectTemplateReferences(template);
  const exportedTags = Array.isArray(fileData.references.tags)
    ? toRecordArray(fileData.references.tags)
    : [];
  const exportedCategories = Array.isArray(fileData.references.categories)
    ? toRecordArray(fileData.references.categories)
    : [];
  const tagKeys = new Set(
    exportedTags.flatMap((tag) => [
      typeof tag.tagId === "string" ? `id:${tag.tagId}` : "",
      typeof tag.slug === "string" ? `slug:${tag.slug}` : ""
    ])
  );
  const categoryIds = new Set(
    exportedCategories
      .map((category) => category.categoryId)
      .filter((value): value is string => typeof value === "string")
  );

  for (const tag of collected.tags) {
    if (!tagKeys.has(`id:${tag.tagId}`) && !tagKeys.has(`slug:${tag.slug}`)) {
      issues.push({
        severity: "warning",
        code: "missing_tag_reference",
        path: "$.references.tags",
        message: `Tag reference ${tag.slug} is used by the template but missing from references.tags.`
      });
    }
  }

  for (const category of collected.categoryIds) {
    if (!categoryIds.has(category)) {
      issues.push({
        severity: "warning",
        code: "missing_category_reference",
        path: "$.references.categories",
        message: `Category ${category} is used by the template but missing from references.categories.`
      });
    }
  }
}

function collectTemplateReferences(
  template: TemplateJsonV1,
  categoryRepository?: CategoryRepository
): TemplateFileV1["references"] & { categoryIds: string[] } {
  const tagMap = new Map<string, TemplateTagRef>();
  const categoryIds = new Set<string>();

  function addTags(tags: readonly TemplateTagRef[]): void {
    for (const tag of tags) {
      tagMap.set(`${tag.tagId}:${tag.slug}`, tag);
    }
  }

  function addCategory(categoryId: string | null): void {
    if (categoryId !== null) {
      categoryIds.add(categoryId);
    }
  }

  if (template.kind === "list") {
    addTags(template.list.tags);
    addCategory(template.list.categoryId);

    for (const item of template.list.items) {
      addTags(item.tags);
    }
  } else {
    addTags(template.container.tags);
    addCategory(template.container.categoryId);

    for (const item of template.container.items) {
      addTags(item.tags);
      addCategory(item.categoryId);

      if (item.list !== undefined) {
        for (const listItem of item.list.items) {
          addTags(listItem.tags);
        }
      }
    }
  }

  return {
    tags: [...tagMap.values()].sort(
      (left, right) => left.slug.localeCompare(right.slug) || left.tagId.localeCompare(right.tagId)
    ),
    categories: [...categoryIds]
      .map((categoryId) => categoryRepository?.getById(categoryId) ?? null)
      .filter((category): category is CategoryRecord => category !== null)
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        color: category.color,
        description: category.description
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug) || left.categoryId.localeCompare(right.categoryId)),
    categoryIds: [...categoryIds].sort()
  };
}

function createValidationSummary(input: {
  sourcePath: string | null;
  fileData: Record<string, unknown> | null;
  template: TemplateJsonV1 | null;
  issues: TemplateImportValidationIssue[];
}): TemplateImportValidationSummary {
  const fileData = input.fileData;
  const metadata = isRecord(fileData?.metadata) ? fileData.metadata : null;
  const capabilities = isCapabilities(fileData?.capabilities)
    ? fileData.capabilities
    : null;

  return {
    valid: !input.issues.some((issue) => issue.severity === "error"),
    sourcePath: input.sourcePath,
    fileVersion: typeof fileData?.fileVersion === "number" ? fileData.fileVersion : null,
    exportedAt: typeof fileData?.exportedAt === "string" ? fileData.exportedAt : null,
    kind: isTemplateKind(metadata?.kind) ? metadata.kind : null,
    name: typeof metadata?.name === "string" ? metadata.name : null,
    description:
      typeof metadata?.description === "string" || metadata?.description === null
        ? metadata.description
        : null,
    template: input.template,
    capabilities,
    counts: input.template === null ? emptyCounts() : countTemplate(input.template),
    issues: input.issues
  };
}

function countTemplate(template: TemplateJsonV1): TemplateImportValidationCounts {
  const refs = collectTemplateReferences(template);

  if (template.kind === "list") {
    return {
      tabs: 0,
      items: 1,
      tasks: 0,
      notes: 0,
      lists: 1,
      links: 0,
      filePlaceholders: 0,
      listItems: template.list.items.length,
      tags: refs.tags.length,
      categories: refs.categoryIds.length
    };
  }

  const items = template.container.items;

  return {
    tabs: template.container.tabs.length,
    items: items.length,
    tasks: items.filter((item) => item.type === "task").length,
    notes: items.filter((item) => item.type === "note").length,
    lists: items.filter((item) => item.type === "list").length,
    links: items.filter((item) => item.type === "link").length,
    filePlaceholders: items.filter((item) => item.type === "file").length,
    listItems: items.reduce((total, item) => total + (item.list?.items.length ?? 0), 0),
    tags: refs.tags.length,
    categories: refs.categoryIds.length
  };
}

function emptyCounts(): TemplateImportValidationCounts {
  return {
    tabs: 0,
    items: 0,
    tasks: 0,
    notes: 0,
    lists: 0,
    links: 0,
    filePlaceholders: 0,
    listItems: 0,
    tags: 0,
    categories: 0
  };
}

function validateCategoryReference(
  value: unknown,
  path: string,
  issues: TemplateImportValidationIssue[]
): void {
  if (!isRecord(value)) {
    issues.push({
      severity: "error",
      code: "invalid_category_reference",
      path,
      message: "Category references must be objects."
    });
    return;
  }

  requireString(value, "categoryId", `${path}.categoryId`, issues);
  requireString(value, "name", `${path}.name`, issues);
  requireString(value, "slug", `${path}.slug`, issues);
  requireString(value, "color", `${path}.color`, issues);
  requireOptionalNullableString(value, "description", `${path}.description`, issues);
}

function validateTagReference(
  value: unknown,
  path: string,
  issues: TemplateImportValidationIssue[]
): void {
  if (!isRecord(value)) {
    issues.push({
      severity: "error",
      code: "invalid_tag_reference",
      path,
      message: "Tag references must be objects."
    });
    return;
  }

  requireString(value, "tagId", `${path}.tagId`, issues);
  requireString(value, "name", `${path}.name`, issues);
  requireString(value, "slug", `${path}.slug`, issues);

  if (value.source !== "inline" && value.source !== "manual" && value.source !== "imported") {
    issues.push({
      severity: "error",
      code: "invalid_tag_source",
      path: `${path}.source`,
      message: "Tag reference source must be inline, manual, or imported."
    });
  }
}

function createTemplateExportRelativePath(exportedAt: string, name: string): string {
  return `exports/templates/${exportedAt.replace(/[:.]/g, "-")}-${slugifyFileName(name)}${LWO_TEMPLATE_FILE_EXTENSION}`;
}

function validateTemplateExportRelativePath(value: string, fieldName: string): void {
  validateNonEmptyString(value, fieldName);

  const normalized = value.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`${fieldName} must be workspace-relative.`);
  }

  if (!normalized.startsWith("exports/") || !normalized.endsWith(LWO_TEMPLATE_FILE_EXTENSION)) {
    throw new Error(
      `${fieldName} must be a ${LWO_TEMPLATE_FILE_EXTENSION} file inside workspace exports.`
    );
  }
}

const capabilityKeys = [
  "tabs",
  "tasks",
  "notes",
  "lists",
  "links",
  "filePlaceholders",
  "tags",
  "categories",
  "relativeDates",
  "contactFields"
] as const;

function isCapabilities(value: unknown): value is TemplateFileCapabilities {
  return (
    isRecord(value) &&
    capabilityKeys.every((key) => typeof value[key] === "boolean")
  );
}

function hasTags(tagGroups: readonly (readonly TemplateTagRef[])[]): boolean {
  return tagGroups.some((tags) => tags.length > 0);
}

function hasRelativeDate(value: TemplateListItemJsonV1 | TemplateContainerItemJsonV1): boolean {
  return (
    (value.startOffsetDays !== null && value.startOffsetDays !== undefined) ||
    (value.dueOffsetDays !== null && value.dueOffsetDays !== undefined) ||
    (value.completedOffsetDays !== null && value.completedOffsetDays !== undefined)
  );
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: TemplateImportValidationIssue[]
): void {
  if (typeof record[key] !== "string" || (record[key] as string).trim().length === 0) {
    issues.push({
      severity: "error",
      code: "missing_string",
      path,
      message: `${path} must be a non-empty string.`
    });
  }
}

function requireOptionalNullableString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: TemplateImportValidationIssue[]
): void {
  const value = record[key];

  if (value !== undefined && value !== null && typeof value !== "string") {
    issues.push({
      severity: "error",
      code: "invalid_string",
      path,
      message: `${path} must be a string, null, or undefined.`
    });
  }
}

function isTemplateKind(value: unknown): value is TemplateKind {
  return value === "list" || value === "project" || value === "contact";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecordArray(values: unknown[]): Record<string, unknown>[] {
  return values.filter(isRecord);
}

function slugifyFileName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "template";
}
