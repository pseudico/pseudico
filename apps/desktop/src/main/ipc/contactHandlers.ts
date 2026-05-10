import {
  ContactService,
  ContactTimelineService,
  type ContactRecord
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type ContactFieldRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type AddContactFieldInput,
  type ApiResult,
  type ContactDetailSummary,
  type ContactFieldSummary,
  type ContactFieldType,
  type ContactSummary,
  type ContactTimelineInput,
  type ContactTimelineSummary,
  type CreateContactInput,
  type CreateContactResult,
  type UpdateContactFieldInput,
  type UpdateContactInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type ContactIpcHandlers = {
  handleCreateContact: (
    input: unknown
  ) => Promise<ApiResult<CreateContactResult>>;
  handleUpdateContact: (
    input: unknown
  ) => Promise<ApiResult<ContactSummary>>;
  handleListContacts: (
    input: unknown
  ) => Promise<ApiResult<ContactSummary[]>>;
  handleGetContact: (
    input: unknown
  ) => Promise<ApiResult<ContactDetailSummary | null>>;
  handleAddField: (
    input: unknown
  ) => Promise<ApiResult<ContactFieldSummary>>;
  handleUpdateField: (
    input: unknown
  ) => Promise<ApiResult<ContactFieldSummary>>;
  handleGetTimeline: (
    input: unknown
  ) => Promise<ApiResult<ContactTimelineSummary>>;
};

export function createContactIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ContactIpcHandlers {
  return {
    async handleCreateContact(input) {
      if (!isCreateContactInput(input)) {
        return apiError("INVALID_INPUT", "createContact requires a name field.");
      }

      return await withContactService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.contactService.createContact({
          ...input,
          workspaceId
        });

        return apiOk({
          contact: toContactSummary(result.contact),
          defaultTabId: result.defaultTab.id,
          fields: result.fields.map(toContactFieldSummary)
        });
      });
    },

    async handleUpdateContact(input) {
      if (!isUpdateContactInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateContact requires a contactId and at least one update field."
        );
      }

      return await withContactService(workspaceService, async (context) =>
        apiOk(
          toContactSummary(await context.contactService.updateContact(input))
        )
      );
    },

    async handleListContacts(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listContacts requires an optional workspaceId string."
        );
      }

      return await withContactService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.contactService.listContacts(workspaceId).map(toContactSummary)
        );
      });
    },

    async handleGetContact(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getContact requires a contactId string."
        );
      }

      return await withContactService(workspaceService, async (context) => {
        const contact = context.contactService.getContact(input);

        if (contact === null) {
          return apiOk(null);
        }

        return apiOk({
          contact: toContactSummary(contact),
          fields: context.contactService
            .listContactFields(contact.id)
            .map(toContactFieldSummary)
        });
      });
    },

    async handleAddField(input) {
      if (!isAddContactFieldInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "addField requires contactId, label, and value fields."
        );
      }

      return await withContactService(workspaceService, async (context) =>
        apiOk(
          toContactFieldSummary(await context.contactService.addContactField(input))
        )
      );
    },

    async handleUpdateField(input) {
      if (!isUpdateContactFieldInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateField requires a fieldId and at least one update field."
        );
      }

      return await withContactService(workspaceService, async (context) =>
        apiOk(
          toContactFieldSummary(
            await context.contactService.updateContactField(input)
          )
        )
      );
    },

    async handleGetTimeline(input) {
      if (!isContactTimelineInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getTimeline requires a contactId and optional timeline filters."
        );
      }

      return await withContactService(workspaceService, async (context) => {
        const timeline = new ContactTimelineService({
          connection: context.connection
        }).getTimeline(input);

        return apiOk({
          ...timeline,
          contact: toContactSummary(timeline.contact)
        });
      });
    }
  };
}

async function withContactService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    contactService: ContactService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      contactService: new ContactService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Contact operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Contact workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toContactSummary(contact: ContactRecord): ContactSummary {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    type: "contact",
    name: contact.name,
    slug: contact.slug,
    description: contact.description,
    status: contact.status,
    categoryId: contact.categoryId,
    color: contact.color,
    isFavorite: contact.isFavorite,
    sortOrder: contact.sortOrder,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    archivedAt: contact.archivedAt,
    deletedAt: contact.deletedAt
  };
}

function toContactFieldSummary(field: ContactFieldRecord): ContactFieldSummary {
  return {
    id: field.id,
    workspaceId: field.workspaceId,
    containerId: field.containerId,
    label: field.label,
    value: field.value,
    type: field.type,
    sortOrder: field.sortOrder,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
    deletedAt: field.deletedAt
  };
}

function isCreateContactInput(input: unknown): input is CreateContactInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.name) &&
    isOptionalString(input.slug) &&
    isOptionalNullableString(input.description) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.color) &&
    isOptionalBoolean(input.isFavorite) &&
    isOptionalNumber(input.sortOrder) &&
    (input.fields === undefined ||
      (Array.isArray(input.fields) && input.fields.every(isContactFieldInput)))
  );
}

function isUpdateContactInput(input: unknown): input is UpdateContactInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.contactId) &&
    (input.name === undefined || isNonEmptyString(input.name)) &&
    isOptionalString(input.slug) &&
    isOptionalNullableString(input.description) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.color) &&
    isOptionalBoolean(input.isFavorite) &&
    isOptionalNumber(input.sortOrder) &&
    (input.status === undefined || isMutableContactStatus(input.status)) &&
    hasContactUpdateField(input)
  );
}

function isAddContactFieldInput(input: unknown): input is AddContactFieldInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.contactId) &&
    isContactFieldInput(input)
  );
}

function isUpdateContactFieldInput(
  input: unknown
): input is UpdateContactFieldInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.fieldId) &&
    (input.label === undefined || isNonEmptyString(input.label)) &&
    (input.value === undefined || isNonEmptyString(input.value)) &&
    (input.type === undefined || isContactFieldTypeValue(input.type)) &&
    isOptionalNumber(input.sortOrder) &&
    ["label", "value", "type", "sortOrder"].some(
      (field) => input[field] !== undefined
    )
  );
}

function isContactTimelineInput(input: unknown): input is ContactTimelineInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.contactId) &&
    (input.filter === undefined || isContactTimelineFilter(input.filter)) &&
    (input.itemTypes === undefined ||
      (Array.isArray(input.itemTypes) &&
        input.itemTypes.every((itemType) => typeof itemType === "string"))) &&
    isOptionalBoolean(input.includeCompleted) &&
    isOptionalNumber(input.limit)
  );
}

function isContactFieldInput(input: unknown): boolean {
  return (
    isRecord(input) &&
    isNonEmptyString(input.label) &&
    isNonEmptyString(input.value) &&
    (input.type === undefined || isContactFieldTypeValue(input.type)) &&
    isOptionalNumber(input.sortOrder)
  );
}

function isContactTimelineFilter(value: unknown): boolean {
  return (
    value === "all" ||
    value === "activity" ||
    value === "content" ||
    value === "follow_up" ||
    value === "relationship"
  );
}

function hasContactUpdateField(input: Record<string, unknown>): boolean {
  return [
    "categoryId",
    "color",
    "description",
    "isFavorite",
    "name",
    "slug",
    "sortOrder",
    "status"
  ].some((field) => input[field] !== undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}

function isMutableContactStatus(value: unknown): boolean {
  return value === "active" || value === "waiting" || value === "completed";
}

function isContactFieldTypeValue(value: unknown): value is ContactFieldType {
  return (
    value === "text" ||
    value === "email" ||
    value === "phone" ||
    value === "website" ||
    value === "address" ||
    value === "date" ||
    value === "custom"
  );
}
