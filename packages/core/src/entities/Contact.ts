export const CONTACT_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "website",
  "address",
  "date",
  "custom"
] as const;

export type ContactFieldType = (typeof CONTACT_FIELD_TYPES)[number];

export const CONTACT_STATUSES = [
  "active",
  "waiting",
  "completed",
  "archived"
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export function isContactFieldType(value: string): value is ContactFieldType {
  return CONTACT_FIELD_TYPES.includes(value as ContactFieldType);
}

export function isContactStatus(value: string): value is ContactStatus {
  return CONTACT_STATUSES.includes(value as ContactStatus);
}
