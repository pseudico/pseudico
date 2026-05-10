import { slugifyTagName, type ContactFieldType } from "@local-work-os/core";
import {
  ContactLabelBrowserRepository,
  TagRepository,
  type ContactLabelBrowserContactRecord,
  type ContactLabelBrowserFieldFilter,
  type ContactLabelBrowserStatus,
  type ContactLabelCategoryFacetRecord,
  type ContactLabelFieldFacetRecord,
  type ContactLabelStatusFacetRecord,
  type ContactLabelTagFacetRecord,
  type ContactLabelValueFacetRecord,
  type DatabaseConnection,
  type TagRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";

export type ContactLabelBrowserGroupBy =
  | "company"
  | "role"
  | "location"
  | "emailDomain"
  | "category"
  | "tag"
  | "status"
  | "field";

export type ContactLabelBrowserFieldFilterInput = {
  label: string;
  value: string;
};

export type ContactLabelBrowserInput = {
  workspaceId: string;
  fieldFilters?: readonly ContactLabelBrowserFieldFilterInput[];
  company?: string | null;
  role?: string | null;
  location?: string | null;
  emailDomain?: string | null;
  tagSlugs?: readonly string[];
  categoryId?: string | null;
  status?: ContactLabelBrowserStatus | null;
  groupBy?: ContactLabelBrowserGroupBy | null;
  fieldGroupLabel?: string | null;
};

export type ContactLabelBrowserFilters = {
  fieldFilters: ContactLabelBrowserFieldFilter[];
  company: string | null;
  role: string | null;
  location: string | null;
  emailDomain: string | null;
  tagSlugs: string[];
  categoryId: string | null;
  status: ContactLabelBrowserStatus | null;
  groupBy: ContactLabelBrowserGroupBy;
  fieldGroupLabel: string | null;
};

export type ContactLabelBrowserGroup = {
  key: string;
  label: string;
  contactCount: number;
  contacts: ContactLabelBrowserContactRecord[];
};

export type ContactLabelBrowserViewModel = {
  workspaceId: string;
  generatedAt: string;
  filters: ContactLabelBrowserFilters;
  selectedTags: TagRecord[];
  fieldFacets: ContactLabelFieldFacetRecord[];
  companyFacets: ContactLabelValueFacetRecord[];
  roleFacets: ContactLabelValueFacetRecord[];
  locationFacets: ContactLabelValueFacetRecord[];
  emailDomainFacets: ContactLabelValueFacetRecord[];
  tagFacets: ContactLabelTagFacetRecord[];
  categoryFacets: ContactLabelCategoryFacetRecord[];
  statusFacets: ContactLabelStatusFacetRecord[];
  contacts: ContactLabelBrowserContactRecord[];
  groups: ContactLabelBrowserGroup[];
  totalContactCount: number;
};

export class ContactLabelBrowserService {
  readonly module = "contacts.labelBrowser";

  private readonly repository: ContactLabelBrowserRepository;
  private readonly tags: TagRepository;
  private readonly now: () => Date;

  constructor(input: { connection: DatabaseConnection; now?: () => Date }) {
    this.repository = new ContactLabelBrowserRepository(input.connection);
    this.tags = new TagRepository(input.connection);
    this.now = input.now ?? (() => new Date());
  }

  getViewModel(input: ContactLabelBrowserInput): ContactLabelBrowserViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const filters = normalizeFilters(input);
    const repositoryInput = {
      workspaceId: input.workspaceId,
      fieldFilters: filters.fieldFilters,
      company: filters.company,
      role: filters.role,
      location: filters.location,
      emailDomain: filters.emailDomain,
      tagSlugs: filters.tagSlugs,
      categoryId: filters.categoryId,
      status: filters.status
    };
    const contacts = this.repository.listContacts(repositoryInput);

    return {
      workspaceId: input.workspaceId,
      generatedAt: this.now().toISOString(),
      filters,
      selectedTags: this.resolveSelectedTags(input.workspaceId, filters.tagSlugs),
      fieldFacets: this.repository.listFieldFacets(repositoryInput),
      companyFacets: this.repository.listCompanyFacets(repositoryInput),
      roleFacets: this.repository.listRoleFacets(repositoryInput),
      locationFacets: this.repository.listLocationFacets(repositoryInput),
      emailDomainFacets: this.repository.listEmailDomainFacets(repositoryInput),
      tagFacets: this.repository.listTagFacets(repositoryInput),
      categoryFacets: this.repository.listCategoryFacets(repositoryInput),
      statusFacets: this.repository.listStatusFacets(repositoryInput),
      contacts,
      groups: groupContacts(contacts, filters),
      totalContactCount: contacts.length
    };
  }

  private resolveSelectedTags(workspaceId: string, tagSlugs: readonly string[]): TagRecord[] {
    return tagSlugs
      .map((slug) => this.tags.findBySlug({ workspaceId, slug }))
      .filter((tag): tag is TagRecord => tag !== null);
  }
}

export const contactLabelBrowserModuleContract = {
  module: "contacts.labelBrowser",
  purpose:
    "Browse contact containers by flexible profile labels, profile values, tags, categories, and grouped CRM facets.",
  owns: [
    "contact profile facet queries",
    "contact browser filter normalization",
    "grouped contact label browser view models"
  ],
  doesNotOwn: ["contact mutations", "external CRM sync", "hosted contact enrichment"],
  integrationPoints: ["contacts", "metadata", "search", "renderer navigation"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function normalizeFilters(input: ContactLabelBrowserInput): ContactLabelBrowserFilters {
  const fieldFilters = normalizeFieldFilters(input.fieldFilters ?? []);
  const groupBy = normalizeGroupBy(input.groupBy ?? inferGroupBy(input));
  const fieldGroupLabel = normalizeOptionalKey(
    input.fieldGroupLabel ?? fieldFilters[0]?.labelKey ?? null,
    "fieldGroupLabel"
  );

  return {
    fieldFilters,
    company: normalizeOptionalKey(input.company ?? null, "company"),
    role: normalizeOptionalKey(input.role ?? null, "role"),
    location: normalizeOptionalKey(input.location ?? null, "location"),
    emailDomain: normalizeOptionalKey(input.emailDomain ?? null, "emailDomain"),
    tagSlugs: normalizeTagSlugs(input.tagSlugs ?? []),
    categoryId: normalizeOptionalString(input.categoryId ?? null, "categoryId"),
    status: normalizeStatus(input.status ?? null),
    groupBy,
    fieldGroupLabel
  };
}

function normalizeFieldFilters(
  values: readonly ContactLabelBrowserFieldFilterInput[]
): ContactLabelBrowserFieldFilter[] {
  const unique = new Map<string, ContactLabelBrowserFieldFilter>();

  for (const value of values) {
    const labelKey = normalizeRequiredKey(value.label, "field filter label");
    const valueKey = normalizeRequiredKey(value.value, "field filter value");
    unique.set(`${labelKey}:${valueKey}`, { labelKey, valueKey });
  }

  return [...unique.values()].sort((a, b) =>
    `${a.labelKey}:${a.valueKey}`.localeCompare(`${b.labelKey}:${b.valueKey}`)
  );
}

function normalizeTagSlugs(values: readonly string[]): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    validateNonEmptyString(value, "tagSlugs");
    const slug = slugifyTagName(value);

    if (slug === null) {
      throw new Error("Tag slugs must contain only letters, numbers, and hyphens.");
    }

    unique.add(slug);
  }

  return [...unique].sort();
}

function inferGroupBy(input: ContactLabelBrowserInput): ContactLabelBrowserGroupBy {
  if (input.company !== undefined && input.company !== null) {
    return "company";
  }

  if (input.role !== undefined && input.role !== null) {
    return "role";
  }

  if (input.location !== undefined && input.location !== null) {
    return "location";
  }

  if (input.emailDomain !== undefined && input.emailDomain !== null) {
    return "emailDomain";
  }

  if ((input.fieldFilters ?? []).length > 0) {
    return "field";
  }

  return "company";
}

function normalizeGroupBy(value: ContactLabelBrowserGroupBy): ContactLabelBrowserGroupBy {
  if (
    value === "company" ||
    value === "role" ||
    value === "location" ||
    value === "emailDomain" ||
    value === "category" ||
    value === "tag" ||
    value === "status" ||
    value === "field"
  ) {
    return value;
  }

  throw new Error("groupBy must be a supported contact browser grouping.");
}

function normalizeStatus(
  value: ContactLabelBrowserStatus | null
): ContactLabelBrowserStatus | null {
  if (value === null) {
    return null;
  }

  if (["active", "waiting", "completed", "archived"].includes(value)) {
    return value;
  }

  throw new Error("status must be active, waiting, completed, or archived.");
}

function normalizeOptionalString(value: string | null, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  validateNonEmptyString(value, fieldName);
  return value.trim();
}

function normalizeOptionalKey(value: string | null, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  return normalizeRequiredKey(value, fieldName);
}

function normalizeRequiredKey(value: string, fieldName: string): string {
  validateNonEmptyString(value, fieldName);
  return value.trim().toLowerCase();
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function groupContacts(
  contacts: ContactLabelBrowserContactRecord[],
  filters: ContactLabelBrowserFilters
): ContactLabelBrowserGroup[] {
  const groups = new Map<string, ContactLabelBrowserContactRecord[]>();

  for (const contact of contacts) {
    for (const key of getGroupKeys(contact, filters)) {
      const current = groups.get(key.key) ?? [];
      current.push(contact);
      groups.set(key.key, current);
    }
  }

  return [...groups.entries()]
    .map(([key, groupedContacts]) => ({
      key,
      label: key,
      contactCount: groupedContacts.length,
      contacts: groupedContacts
    }))
    .sort((a, b) => b.contactCount - a.contactCount || a.label.localeCompare(b.label));
}

function getGroupKeys(
  contact: ContactLabelBrowserContactRecord,
  filters: ContactLabelBrowserFilters
): { key: string }[] {
  if (filters.groupBy === "category") {
    return [{ key: contact.category?.name ?? "No category" }];
  }

  if (filters.groupBy === "status") {
    return [{ key: formatStatus(contact.status) }];
  }

  if (filters.groupBy === "tag") {
    return contact.tags.length === 0
      ? [{ key: "No tags" }]
      : contact.tags.map((tag) => ({ key: `@${tag.slug}` }));
  }

  if (filters.groupBy === "emailDomain") {
    return valuesForContact(contact, ["email", "e-mail", "mail"], true);
  }

  if (filters.groupBy === "role") {
    return valuesForContact(contact, ["role", "title", "job title", "position"]);
  }

  if (filters.groupBy === "location") {
    return valuesForContact(contact, ["location", "city", "office", "address"]);
  }

  if (filters.groupBy === "field" && filters.fieldGroupLabel !== null) {
    return valuesForContact(contact, [filters.fieldGroupLabel]);
  }

  return valuesForContact(contact, ["company", "organisation", "organization"]);
}

function valuesForContact(
  contact: ContactLabelBrowserContactRecord,
  labelKeys: readonly string[],
  emailDomain = false
): { key: string }[] {
  const values = contact.fields
    .filter((field) => labelKeys.includes(field.labelKey))
    .map((field) => (emailDomain ? extractEmailDomain(field.value) : field.value.trim()))
    .filter((value): value is string => value !== null && value.length > 0);

  if (values.length === 0) {
    return [{ key: `No ${labelKeys[0]}` }];
  }

  return [...new Set(values)].map((value) => ({ key: value }));
}

function extractEmailDomain(value: string): string | null {
  const atIndex = value.indexOf("@");

  if (atIndex <= 0 || atIndex === value.length - 1) {
    return null;
  }

  return value.slice(atIndex + 1).trim().toLowerCase();
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export type { ContactFieldType };
