import {
  createIsoTimestamp,
  createLocalDayRange,
  type Clock
} from "@local-work-os/core";
import {
  ContactFieldRepository,
  ContainerRepository,
  TabSummaryRepository,
  type ContactFieldRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type TabSummaryRecord
} from "@local-work-os/db";
import type { ContactRecord } from "./ContactCommands";

export type ContactSummaryOverview = {
  contact: ContactRecord;
  fields: ContactFieldRecord[];
  generatedAt: string;
  tabSummaries: TabSummaryRecord[];
};

export class ContactSummaryService {
  readonly module = "contacts.summary";

  private readonly connection: DatabaseConnection;
  private readonly now: Clock;

  constructor(input: { connection: DatabaseConnection; now?: Clock }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getContactSummary(
    contactId: string,
    input: { previewLimit?: number } = {}
  ): ContactSummaryOverview {
    validateNonEmptyString(contactId, "contactId");
    const contact = this.requireContact(contactId);
    const fields = new ContactFieldRepository(this.connection).listForContact({
      workspaceId: contact.workspaceId,
      containerId: contact.id
    });
    const tabSummaries = new TabSummaryRepository(this.connection).listByContainer({
      containerId: contact.id,
      todayStart: createLocalDayRange(this.now()).startInclusive,
      ...(input.previewLimit === undefined ? {} : { previewLimit: input.previewLimit })
    });

    return {
      contact,
      fields,
      generatedAt: createIsoTimestamp(this.now()),
      tabSummaries
    };
  }

  private requireContact(contactId: string): ContactRecord {
    const container = new ContainerRepository(this.connection).getById(contactId);

    if (container === null || container.type !== "contact") {
      throw new Error(`Contact was not found: ${contactId}.`);
    }

    return asContactRecord(container);
  }
}

function asContactRecord(container: ContainerRecord): ContactRecord {
  if (container.type !== "contact") {
    throw new Error(`Expected contact container but received ${container.type}.`);
  }

  return container as ContactRecord;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
