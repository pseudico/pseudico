import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isContactFieldType,
  type ActivityActorType,
  type ContactFieldType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContactFieldRepository,
  ContainerRepository,
  ContainerTabRepository,
  SearchIndexService,
  TransactionService,
  type ContactFieldRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type SearchIndexRecord,
  type UpdateContactFieldPatch,
  type UpdateContainerPatch
} from "@local-work-os/db";
import type {
  AddContactFieldInput,
  ContactFieldInput,
  ContactRecord,
  CreateContactInput,
  CreateContactResult,
  DeleteContactFieldInput,
  UpdateContactFieldInput,
  UpdateContactInput
} from "./ContactCommands";

// Owns contact/client container application operations.
// Does not own hosted CRM behavior or project lifecycle internals.
export type ContactServiceIdFactory = (prefix: string) => string;

export class ContactService {
  readonly module = "contacts";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ContactServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ContactServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createContact(input: CreateContactInput): Promise<CreateContactResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const containerTabRepository = new ContainerTabRepository(this.connection);
      const contactFieldRepository = new ContactFieldRepository(this.connection);
      const activityLogService = this.createActivityLogService();
      const searchIndexService = this.createSearchIndexService();
      const slug = this.createUniqueSlug(
        input.workspaceId,
        input.slug ?? input.name
      );
      const contact = asContactRecord(
        containerRepository.create({
          id: this.idFactory("container"),
          workspaceId: input.workspaceId,
          type: "contact",
          name: input.name.trim(),
          slug,
          description:
            input.description === undefined
              ? null
              : normalizeNullableString(input.description),
          status: "active",
          categoryId:
            input.categoryId === undefined
              ? null
              : normalizeNullableString(input.categoryId),
          color:
            input.color === undefined ? null : normalizeNullableString(input.color),
          isSystem: false,
          timestamp,
          ...(input.isFavorite === undefined
            ? {}
            : { isFavorite: input.isFavorite }),
          ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder })
        })
      );
      const defaultTab = containerTabRepository.createDefaultTab({
        id: this.idFactory("container_tab"),
        workspaceId: input.workspaceId,
        containerId: contact.id,
        timestamp
      });
      const fields = (input.fields ?? []).map((field) =>
        contactFieldRepository.create({
          id: this.idFactory("contact_field"),
          workspaceId: contact.workspaceId,
          containerId: contact.id,
          label: field.label.trim(),
          value: field.value.trim(),
          type: field.type ?? "text",
          timestamp,
          ...(field.sortOrder === undefined
            ? {}
            : { sortOrder: field.sortOrder })
        })
      );

      activityLogService.logEvent({
        workspaceId: contact.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerCreated,
        targetType: "container",
        targetId: contact.id,
        summary: `Created contact "${contact.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify({
          contact,
          defaultTabId: defaultTab.id,
          fields
        }),
        timestamp
      });

      for (const field of fields) {
        activityLogService.logEvent({
          workspaceId: contact.workspaceId,
          actorType: input.actorType ?? "local_user",
          action: ActivityAction.contactFieldCreated,
          targetType: "contact_field",
          targetId: field.id,
          summary: `Added ${field.label} field to contact "${contact.name}".`,
          beforeJson: null,
          afterJson: JSON.stringify(field),
          timestamp
        });
      }

      const searchRecord = this.upsertContactSearchRecord(
        searchIndexService,
        contact,
        fields,
        timestamp
      );

      return {
        contact,
        defaultTab,
        fields,
        searchRecord
      };
    });
  }

  async updateContact(input: UpdateContactInput): Promise<ContactRecord> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const contactFieldRepository = new ContactFieldRepository(this.connection);
      const activityLogService = this.createActivityLogService();
      const searchIndexService = this.createSearchIndexService();
      const before = this.requireContact(input.contactId);
      const patch: UpdateContainerPatch = { timestamp };

      if (input.name !== undefined) {
        patch.name = input.name.trim();
      }

      if (input.slug !== undefined) {
        patch.slug = this.createUniqueSlug(
          before.workspaceId,
          input.slug,
          before.id
        );
      }

      if (input.description !== undefined) {
        patch.description = normalizeNullableString(input.description);
      }

      if (input.status !== undefined) {
        patch.status = input.status;
      }

      if (input.categoryId !== undefined) {
        patch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.color !== undefined) {
        patch.color = normalizeNullableString(input.color);
      }

      if (input.isFavorite !== undefined) {
        patch.isFavorite = input.isFavorite;
      }

      if (input.sortOrder !== undefined) {
        patch.sortOrder = input.sortOrder;
      }

      const contact = asContactRecord(
        containerRepository.update(input.contactId, patch)
      );
      const fields = contactFieldRepository.listForContact({
        workspaceId: contact.workspaceId,
        containerId: contact.id
      });

      activityLogService.logEvent({
        workspaceId: contact.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerUpdated,
        targetType: "container",
        targetId: contact.id,
        summary: `Updated contact "${contact.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(contact),
        timestamp
      });

      this.upsertContactSearchRecord(searchIndexService, contact, fields, timestamp);

      return contact;
    });
  }

  async archiveContact(
    contactId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ContactRecord> {
    validateNonEmptyString(contactId, "contactId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const contactFieldRepository = new ContactFieldRepository(this.connection);
      const activityLogService = this.createActivityLogService();
      const searchIndexService = this.createSearchIndexService();
      const before = this.requireContact(contactId);
      const contact = asContactRecord(
        containerRepository.archive(contactId, timestamp)
      );
      const fields = contactFieldRepository.listForContact({
        workspaceId: contact.workspaceId,
        containerId: contact.id
      });

      activityLogService.logEvent({
        workspaceId: contact.workspaceId,
        actorType,
        action: ActivityAction.containerArchived,
        targetType: "container",
        targetId: contact.id,
        summary: `Archived contact "${contact.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(contact),
        timestamp
      });

      this.upsertContactSearchRecord(searchIndexService, contact, fields, timestamp);

      return contact;
    });
  }

  async addContactField(
    input: AddContactFieldInput
  ): Promise<ContactFieldRecord> {
    this.validateAddFieldInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const contactFieldRepository = new ContactFieldRepository(this.connection);
      const activityLogService = this.createActivityLogService();
      const searchIndexService = this.createSearchIndexService();
      const contact = this.requireContact(input.contactId);
      const field = contactFieldRepository.create({
        id: this.idFactory("contact_field"),
        workspaceId: contact.workspaceId,
        containerId: contact.id,
        label: input.label.trim(),
        value: input.value.trim(),
        type: input.type ?? "text",
        timestamp,
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder })
      });

      activityLogService.logEvent({
        workspaceId: contact.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.contactFieldCreated,
        targetType: "contact_field",
        targetId: field.id,
        summary: `Added ${field.label} field to contact "${contact.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify(field),
        timestamp
      });

      this.reindexContact(searchIndexService, contact, contactFieldRepository, timestamp);

      return field;
    });
  }

  async updateContactField(
    input: UpdateContactFieldInput
  ): Promise<ContactFieldRecord> {
    this.validateUpdateFieldInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const contactFieldRepository = new ContactFieldRepository(this.connection);
      const activityLogService = this.createActivityLogService();
      const searchIndexService = this.createSearchIndexService();
      const before = this.requireContactField(input.fieldId);
      const contact = this.requireContact(before.containerId);
      const patch: UpdateContactFieldPatch = { timestamp };

      if (input.label !== undefined) {
        patch.label = input.label.trim();
      }

      if (input.value !== undefined) {
        patch.value = input.value.trim();
      }

      if (input.type !== undefined) {
        patch.type = input.type;
      }

      if (input.sortOrder !== undefined) {
        patch.sortOrder = input.sortOrder;
      }

      const field = contactFieldRepository.update(input.fieldId, patch);

      activityLogService.logEvent({
        workspaceId: field.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.contactFieldUpdated,
        targetType: "contact_field",
        targetId: field.id,
        summary: `Updated ${field.label} field on contact "${contact.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(field),
        timestamp
      });

      this.reindexContact(searchIndexService, contact, contactFieldRepository, timestamp);

      return field;
    });
  }

  async deleteContactField(
    input: DeleteContactFieldInput | string
  ): Promise<ContactFieldRecord> {
    const normalizedInput =
      typeof input === "string" ? { fieldId: input } : input;
    validateNonEmptyString(normalizedInput.fieldId, "fieldId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const contactFieldRepository = new ContactFieldRepository(this.connection);
      const activityLogService = this.createActivityLogService();
      const searchIndexService = this.createSearchIndexService();
      const before = this.requireContactField(normalizedInput.fieldId);
      const contact = this.requireContact(before.containerId);
      const field = contactFieldRepository.softDelete(
        normalizedInput.fieldId,
        timestamp
      );

      activityLogService.logEvent({
        workspaceId: field.workspaceId,
        actorType: normalizedInput.actorType ?? "local_user",
        action: ActivityAction.contactFieldDeleted,
        targetType: "contact_field",
        targetId: field.id,
        summary: `Deleted ${field.label} field from contact "${contact.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(field),
        timestamp
      });

      this.reindexContact(searchIndexService, contact, contactFieldRepository, timestamp);

      return field;
    });
  }

  listContacts(workspaceId: string): ContactRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new ContainerRepository(this.connection)
      .listByWorkspace(workspaceId, { type: "contact" })
      .map(asContactRecord);
  }

  listContactFields(contactId: string): ContactFieldRecord[] {
    const contact = this.requireContact(contactId);

    return new ContactFieldRepository(this.connection).listForContact({
      workspaceId: contact.workspaceId,
      containerId: contact.id
    });
  }

  getContact(contactId: string): ContactRecord | null {
    validateNonEmptyString(contactId, "contactId");

    const container = new ContainerRepository(this.connection).getById(contactId);

    if (container === null || container.type !== "contact") {
      return null;
    }

    return asContactRecord(container);
  }

  private createActivityLogService(): ActivityLogService {
    return new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    });
  }

  private createSearchIndexService(): SearchIndexService {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }

  private requireContact(contactId: string): ContactRecord {
    const contact = this.getContact(contactId);

    if (contact === null) {
      throw new Error(`Contact was not found: ${contactId}.`);
    }

    if (contact.isSystem) {
      throw new Error("System containers cannot be modified as contacts.");
    }

    return contact;
  }

  private requireContactField(fieldId: string): ContactFieldRecord {
    validateNonEmptyString(fieldId, "fieldId");

    const field = new ContactFieldRepository(this.connection).getById(fieldId);

    if (field === null) {
      throw new Error(`Contact field was not found: ${fieldId}.`);
    }

    return field;
  }

  private createUniqueSlug(
    workspaceId: string,
    value: string,
    currentContactId?: string
  ): string {
    const baseSlug = slugify(value);
    const existingSlugs = new Set(
      new ContainerRepository(this.connection)
        .listByWorkspace(workspaceId, {
          includeArchived: true,
          includeDeleted: true
        })
        .filter((container) => container.id !== currentContactId)
        .map((container) => container.slug)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;

    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }

  private reindexContact(
    searchIndexService: SearchIndexService,
    contact: ContactRecord,
    contactFieldRepository: ContactFieldRepository,
    timestamp: string
  ): SearchIndexRecord {
    return this.upsertContactSearchRecord(
      searchIndexService,
      contact,
      contactFieldRepository.listForContact({
        workspaceId: contact.workspaceId,
        containerId: contact.id
      }),
      timestamp
    );
  }

  private upsertContactSearchRecord(
    searchIndexService: SearchIndexService,
    contact: ContactRecord,
    fields: ContactFieldRecord[],
    timestamp: string
  ): SearchIndexRecord {
    return searchIndexService.upsertContainer(contact, {
      body: buildContactSearchBody(contact, fields),
      metadata: {
        contactFieldIds: fields.map((field) => field.id),
        contactFieldLabels: fields.map((field) => field.label),
        contactFieldValues: fields.map((field) => field.value),
        contactFieldTypes: fields.map((field) => field.type)
      },
      timestamp
    });
  }

  private validateCreateInput(input: CreateContactInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.name, "name");

    if (input.slug !== undefined) {
      validateNonEmptyString(input.slug, "slug");
    }

    for (const field of input.fields ?? []) {
      validateContactFieldInput(field);
    }
  }

  private validateUpdateInput(input: UpdateContactInput): void {
    validateNonEmptyString(input.contactId, "contactId");

    if (input.name !== undefined) {
      validateNonEmptyString(input.name, "name");
    }

    if (input.slug !== undefined) {
      validateNonEmptyString(input.slug, "slug");
    }

    if (
      input.status !== undefined &&
      !["active", "waiting", "completed"].includes(input.status)
    ) {
      throw new Error("status must be active, waiting, or completed.");
    }

    if (
      input.name === undefined &&
      input.slug === undefined &&
      input.description === undefined &&
      input.status === undefined &&
      input.categoryId === undefined &&
      input.color === undefined &&
      input.isFavorite === undefined &&
      input.sortOrder === undefined
    ) {
      throw new Error("At least one contact field must be provided.");
    }
  }

  private validateAddFieldInput(input: AddContactFieldInput): void {
    validateNonEmptyString(input.contactId, "contactId");
    validateContactFieldInput(input);
  }

  private validateUpdateFieldInput(input: UpdateContactFieldInput): void {
    validateNonEmptyString(input.fieldId, "fieldId");

    if (input.label !== undefined) {
      validateNonEmptyString(input.label, "label");
    }

    if (input.value !== undefined) {
      validateNonEmptyString(input.value, "value");
    }

    if (input.type !== undefined) {
      validateContactFieldType(input.type);
    }

    if (
      input.label === undefined &&
      input.value === undefined &&
      input.type === undefined &&
      input.sortOrder === undefined
    ) {
      throw new Error("At least one contact field property must be provided.");
    }
  }
}

export const contactsModuleContract = {
  module: "contacts",
  purpose: "Manage contact/client containers and local CRM-style context.",
  owns: ["contact application operations", "contact profile context", "interaction projections"],
  doesNotOwn: ["project lifecycle", "raw database repositories", "hosted CRM behavior"],
  integrationPoints: ["projects", "metadata", "search", "dashboard", "saved views", "files", "notes"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function asContactRecord(container: ContainerRecord): ContactRecord {
  if (container.type !== "contact") {
    throw new Error(`Expected contact container but received ${container.type}.`);
  }

  return container as ContactRecord;
}

function buildContactSearchBody(
  contact: ContactRecord,
  fields: ContactFieldRecord[]
): string {
  return [
    contact.description ?? "",
    ...fields.flatMap((field) => [field.label, field.value, field.type])
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");
}

function validateContactFieldInput(input: ContactFieldInput): void {
  validateNonEmptyString(input.label, "label");
  validateNonEmptyString(input.value, "value");
  validateContactFieldType(input.type ?? "text");
}

function validateContactFieldType(value: ContactFieldType): void {
  if (!isContactFieldType(value)) {
    throw new Error("type must be a supported contact field type.");
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeNullableString(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "contact" : slug;
}
