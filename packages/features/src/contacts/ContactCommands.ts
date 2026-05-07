import type {
  ActivityActorType,
  ContactFieldType,
  ContactStatus
} from "@local-work-os/core";
import type {
  ContactFieldRecord,
  ContainerRecord,
  ContainerTabRecord,
  SearchIndexRecord
} from "@local-work-os/db";

export type ContactMutableStatus = Exclude<ContactStatus, "archived">;

export type ContactRecord = Omit<ContainerRecord, "status" | "type"> & {
  status: ContactStatus;
  type: "contact";
};

export type ContactFieldInput = {
  label: string;
  value: string;
  type?: ContactFieldType;
  sortOrder?: number;
};

export type CreateContactInput = {
  workspaceId: string;
  name: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  fields?: ContactFieldInput[];
  isFavorite?: boolean;
  slug?: string;
  sortOrder?: number;
};

export type CreateContactResult = {
  contact: ContactRecord;
  defaultTab: ContainerTabRecord;
  fields: ContactFieldRecord[];
  searchRecord: SearchIndexRecord;
};

export type UpdateContactInput = {
  contactId: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: ContactMutableStatus;
};

export type AddContactFieldInput = ContactFieldInput & {
  contactId: string;
  actorType?: ActivityActorType;
};

export type UpdateContactFieldInput = {
  fieldId: string;
  actorType?: ActivityActorType;
  label?: string;
  value?: string;
  type?: ContactFieldType;
  sortOrder?: number;
};

export type DeleteContactFieldInput = {
  fieldId: string;
  actorType?: ActivityActorType;
};
