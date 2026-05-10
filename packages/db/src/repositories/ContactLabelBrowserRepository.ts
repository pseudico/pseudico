import type { ContactFieldType } from "@local-work-os/core";
import type { ContainerRecord } from "./ContainerRepository";
import type { TaggedTargetRecord } from "./TagRepository";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type ContactLabelBrowserStatus =
  | "active"
  | "waiting"
  | "completed"
  | "archived";

export type ContactLabelBrowserFieldFilter = {
  labelKey: string;
  valueKey: string;
};

export type ContactLabelBrowserFilterInput = {
  workspaceId: string;
  fieldFilters?: readonly ContactLabelBrowserFieldFilter[];
  company?: string | null;
  role?: string | null;
  location?: string | null;
  emailDomain?: string | null;
  tagSlugs?: readonly string[];
  categoryId?: string | null;
  status?: ContactLabelBrowserStatus | null;
};

type ContactRow = {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  category_id: string | null;
  color: string | null;
  is_favorite: number;
  is_system: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_color: string | null;
};

type FieldFacetRow = {
  label: string;
  label_key: string;
  value: string;
  value_key: string;
  type: ContactFieldType;
  contact_count: number;
};

type SimpleFacetRow = {
  value: string;
  value_key: string;
  contact_count: number;
};

type CategoryFacetRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  contact_count: number;
};

type TagFacetRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  contact_count: number;
};

type StatusFacetRow = {
  status: string;
  contact_count: number;
};

type ContactFieldRow = {
  id: string;
  workspace_id: string;
  container_id: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ContactLabelFieldFacetRecord = {
  label: string;
  labelKey: string;
  value: string;
  valueKey: string;
  type: ContactFieldType;
  contactCount: number;
};

export type ContactLabelValueFacetRecord = {
  value: string;
  valueKey: string;
  contactCount: number;
};

export type ContactLabelCategoryFacetRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  contactCount: number;
};

export type ContactLabelTagFacetRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  contactCount: number;
};

export type ContactLabelStatusFacetRecord = {
  status: ContactLabelBrowserStatus;
  contactCount: number;
};

export type ContactLabelBrowserCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type ContactLabelBrowserContactFieldRecord = {
  id: string;
  workspaceId: string;
  containerId: string;
  label: string;
  labelKey: string;
  value: string;
  valueKey: string;
  type: ContactFieldType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ContactLabelBrowserContactRecord = ContainerRecord & {
  category: ContactLabelBrowserCategoryRecord | null;
  fields: ContactLabelBrowserContactFieldRecord[];
  tags: TaggedTargetRecord[];
};

const COMPANY_LABEL_KEYS = ["company", "organisation", "organization"];
const ROLE_LABEL_KEYS = ["role", "title", "job title", "position"];
const LOCATION_LABEL_KEYS = ["location", "city", "office", "address"];

export class ContactLabelBrowserRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  listFieldFacets(
    input: ContactLabelBrowserFilterInput
  ): ContactLabelFieldFacetRecord[] {
    const contactFilter = buildContactFilter(input, "c");
    const rows = this.connection.sqlite
      .prepare<unknown[], FieldFacetRow>(
        `select
           cf.label,
           lower(trim(cf.label)) as label_key,
           cf.value,
           lower(trim(cf.value)) as value_key,
           cf.type,
           count(distinct c.id) as contact_count
         from contact_fields cf
         join containers c on c.id = cf.container_id
         where cf.workspace_id = ?
           and cf.deleted_at is null
           and trim(cf.label) <> ''
           and trim(cf.value) <> ''
           and ${contactFilter.sql}
         group by label_key, value_key, cf.type
         having contact_count > 0
         order by contact_count desc, label_key asc, value_key asc`
      )
      .all(input.workspaceId, ...contactFilter.values);

    return rows.map(toFieldFacetRecord);
  }

  listCompanyFacets(input: ContactLabelBrowserFilterInput): ContactLabelValueFacetRecord[] {
    return this.listProfileValueFacets(input, COMPANY_LABEL_KEYS);
  }

  listRoleFacets(input: ContactLabelBrowserFilterInput): ContactLabelValueFacetRecord[] {
    return this.listProfileValueFacets(input, ROLE_LABEL_KEYS);
  }

  listLocationFacets(input: ContactLabelBrowserFilterInput): ContactLabelValueFacetRecord[] {
    return this.listProfileValueFacets(input, LOCATION_LABEL_KEYS);
  }

  listEmailDomainFacets(
    input: ContactLabelBrowserFilterInput
  ): ContactLabelValueFacetRecord[] {
    const contactFilter = buildContactFilter(
      { ...input, emailDomain: null },
      "c"
    );
    const rows = this.connection.sqlite
      .prepare<unknown[], SimpleFacetRow>(
        `select
           lower(substr(cf.value, instr(cf.value, '@') + 1)) as value,
           lower(substr(cf.value, instr(cf.value, '@') + 1)) as value_key,
           count(distinct c.id) as contact_count
         from contact_fields cf
         join containers c on c.id = cf.container_id
         where cf.workspace_id = ?
           and cf.deleted_at is null
           and instr(cf.value, '@') > 1
           and lower(trim(cf.label)) in ('email', 'e-mail', 'mail')
           and ${contactFilter.sql}
         group by value_key
         having contact_count > 0
         order by contact_count desc, value_key asc`
      )
      .all(input.workspaceId, ...contactFilter.values);

    return rows.map(toValueFacetRecord);
  }

  listTagFacets(input: ContactLabelBrowserFilterInput): ContactLabelTagFacetRecord[] {
    const contactFilter = buildContactFilter(input, "c");
    const rows = this.connection.sqlite
      .prepare<unknown[], TagFacetRow>(
        `select
           t.id,
           t.workspace_id,
           t.name,
           t.slug,
           t.created_at,
           t.updated_at,
           t.deleted_at,
           count(distinct c.id) as contact_count
         from tags t
         join taggings tg on tg.tag_id = t.id
           and tg.workspace_id = t.workspace_id
           and tg.target_type = 'container'
           and tg.deleted_at is null
         join containers c on c.id = tg.target_id
         where t.workspace_id = ?
           and t.deleted_at is null
           and ${contactFilter.sql}
         group by t.id
         having contact_count > 0
         order by contact_count desc, t.slug asc`
      )
      .all(input.workspaceId, ...contactFilter.values);

    return rows.map(toTagFacetRecord);
  }

  listCategoryFacets(
    input: ContactLabelBrowserFilterInput
  ): ContactLabelCategoryFacetRecord[] {
    const contactFilter = buildContactFilter({ ...input, categoryId: null }, "c");
    const rows = this.connection.sqlite
      .prepare<unknown[], CategoryFacetRow>(
        `select
           cat.id,
           cat.workspace_id,
           cat.name,
           cat.slug,
           cat.color,
           cat.description,
           cat.created_at,
           cat.updated_at,
           cat.deleted_at,
           count(distinct c.id) as contact_count
         from categories cat
         join containers c on c.category_id = cat.id
         where cat.workspace_id = ?
           and cat.deleted_at is null
           and ${contactFilter.sql}
         group by cat.id
         having contact_count > 0
         order by cat.name collate nocase asc, cat.created_at asc`
      )
      .all(input.workspaceId, ...contactFilter.values);

    return rows.map(toCategoryFacetRecord);
  }

  listStatusFacets(
    input: ContactLabelBrowserFilterInput
  ): ContactLabelStatusFacetRecord[] {
    const contactFilter = buildContactFilter({ ...input, status: null }, "c", {
      includeArchivedWhenNoStatus: true
    });
    const rows = this.connection.sqlite
      .prepare<unknown[], StatusFacetRow>(
        `select c.status, count(distinct c.id) as contact_count
         from containers c
         where ${contactFilter.sql}
         group by c.status
         order by case c.status
           when 'active' then 1
           when 'waiting' then 2
           when 'completed' then 3
           when 'archived' then 4
           else 5
         end`
      )
      .all(...contactFilter.values);

    return rows.map((row) => ({
      status: row.status as ContactLabelBrowserStatus,
      contactCount: row.contact_count
    }));
  }

  listContacts(
    input: ContactLabelBrowserFilterInput
  ): ContactLabelBrowserContactRecord[] {
    const contactFilter = buildContactFilter(input, "c");
    const rows = this.connection.sqlite
      .prepare<unknown[], ContactRow>(
        `select
           c.*,
           cat.name as category_name,
           cat.slug as category_slug,
           cat.color as category_color
         from containers c
         left join categories cat on cat.id = c.category_id
           and cat.deleted_at is null
         where ${contactFilter.sql}
         order by c.sort_order asc, c.name collate nocase asc, c.created_at asc`
      )
      .all(...contactFilter.values);

    return rows.map((row) => ({
      ...toContainerRecord(row),
      category:
        row.category_id === null ||
        row.category_name === null ||
        row.category_slug === null ||
        row.category_color === null
          ? null
          : {
              id: row.category_id,
              name: row.category_name,
              slug: row.category_slug,
              color: row.category_color
            },
      fields: this.listFieldsForContact(row.workspace_id, row.id),
      tags: this.listTagsForContact(row.workspace_id, row.id)
    }));
  }

  private listProfileValueFacets(
    input: ContactLabelBrowserFilterInput,
    labelKeys: readonly string[]
  ): ContactLabelValueFacetRecord[] {
    const contactFilter = buildContactFilter(input, "c");
    const placeholders = labelKeys.map(() => "?").join(", ");
    const rows = this.connection.sqlite
      .prepare<unknown[], SimpleFacetRow>(
        `select
           cf.value,
           lower(trim(cf.value)) as value_key,
           count(distinct c.id) as contact_count
         from contact_fields cf
         join containers c on c.id = cf.container_id
         where cf.workspace_id = ?
           and cf.deleted_at is null
           and lower(trim(cf.label)) in (${placeholders})
           and trim(cf.value) <> ''
           and ${contactFilter.sql}
         group by value_key
         having contact_count > 0
         order by contact_count desc, value_key asc`
      )
      .all(input.workspaceId, ...labelKeys, ...contactFilter.values);

    return rows.map(toValueFacetRecord);
  }

  private listFieldsForContact(
    workspaceId: string,
    contactId: string
  ): ContactLabelBrowserContactFieldRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string, string], ContactFieldRow>(
        `select *
         from contact_fields
         where workspace_id = ?
           and container_id = ?
           and deleted_at is null
         order by sort_order asc, created_at asc, id asc`
      )
      .all(workspaceId, contactId);

    return rows.map(toContactFieldRecord);
  }

  private listTagsForContact(
    workspaceId: string,
    contactId: string
  ): TaggedTargetRecord[] {
    const rows = this.connection.sqlite
      .prepare<
        [string, string],
        {
          id: string;
          workspace_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          tagging_id: string;
          tagging_source: string;
          tagging_created_at: string;
          tagging_deleted_at: string | null;
        }
      >(
        `select
           t.*,
           tg.id as tagging_id,
           tg.source as tagging_source,
           tg.created_at as tagging_created_at,
           tg.deleted_at as tagging_deleted_at
         from taggings tg
         join tags t on t.id = tg.tag_id
         where tg.workspace_id = ?
           and tg.target_type = 'container'
           and tg.target_id = ?
           and tg.deleted_at is null
           and t.deleted_at is null
         order by t.slug asc`
      )
      .all(workspaceId, contactId);

    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      taggingId: row.tagging_id,
      taggingSource: row.tagging_source as TaggedTargetRecord["taggingSource"],
      taggingCreatedAt: row.tagging_created_at,
      taggingDeletedAt: row.tagging_deleted_at
    }));
  }
}

function buildContactFilter(
  input: ContactLabelBrowserFilterInput,
  alias: string,
  options: { includeArchivedWhenNoStatus?: boolean } = {}
): { sql: string; values: unknown[] } {
  const where = [
    `${alias}.workspace_id = ?`,
    `${alias}.type = 'contact'`,
    `${alias}.deleted_at is null`
  ];
  const values: unknown[] = [input.workspaceId];

  if (input.status !== undefined && input.status !== null) {
    where.push(`${alias}.status = ?`);
    values.push(input.status);
  } else if (options.includeArchivedWhenNoStatus !== true) {
    where.push(`${alias}.archived_at is null`);
  }

  if (input.categoryId !== undefined && input.categoryId !== null) {
    where.push(`${alias}.category_id = ?`);
    values.push(input.categoryId);
  }

  for (const filter of input.fieldFilters ?? []) {
    where.push(
      `exists (
         select 1
         from contact_fields selected_cf
         where selected_cf.workspace_id = ${alias}.workspace_id
           and selected_cf.container_id = ${alias}.id
           and selected_cf.deleted_at is null
           and lower(trim(selected_cf.label)) = ?
           and lower(trim(selected_cf.value)) = ?
       )`
    );
    values.push(filter.labelKey, filter.valueKey);
  }

  addProfileFilter(where, values, alias, COMPANY_LABEL_KEYS, input.company);
  addProfileFilter(where, values, alias, ROLE_LABEL_KEYS, input.role);
  addProfileFilter(where, values, alias, LOCATION_LABEL_KEYS, input.location);

  if (input.emailDomain !== undefined && input.emailDomain !== null) {
    where.push(
      `exists (
         select 1
         from contact_fields email_cf
         where email_cf.workspace_id = ${alias}.workspace_id
           and email_cf.container_id = ${alias}.id
           and email_cf.deleted_at is null
           and instr(email_cf.value, '@') > 1
           and lower(trim(email_cf.label)) in ('email', 'e-mail', 'mail')
           and lower(substr(email_cf.value, instr(email_cf.value, '@') + 1)) = ?
       )`
    );
    values.push(input.emailDomain);
  }

  for (const tagSlug of input.tagSlugs ?? []) {
    where.push(
      `exists (
         select 1
         from taggings selected_tg
         join tags selected_tag on selected_tag.id = selected_tg.tag_id
           and selected_tag.deleted_at is null
         where selected_tg.workspace_id = ${alias}.workspace_id
           and selected_tg.target_type = 'container'
           and selected_tg.target_id = ${alias}.id
           and selected_tg.deleted_at is null
           and selected_tag.slug = ?
       )`
    );
    values.push(tagSlug);
  }

  return { sql: where.join(" and "), values };
}

function addProfileFilter(
  where: string[],
  values: unknown[],
  alias: string,
  labelKeys: readonly string[],
  value: string | null | undefined
): void {
  if (value === undefined || value === null) {
    return;
  }

  where.push(
    `exists (
       select 1
       from contact_fields profile_cf
       where profile_cf.workspace_id = ${alias}.workspace_id
         and profile_cf.container_id = ${alias}.id
         and profile_cf.deleted_at is null
         and lower(trim(profile_cf.label)) in (${labelKeys.map(() => "?").join(", ")})
         and lower(trim(profile_cf.value)) = ?
     )`
  );
  values.push(...labelKeys, value);
}

function toFieldFacetRecord(row: FieldFacetRow): ContactLabelFieldFacetRecord {
  return {
    label: row.label,
    labelKey: row.label_key,
    value: row.value,
    valueKey: row.value_key,
    type: row.type,
    contactCount: row.contact_count
  };
}

function toValueFacetRecord(row: SimpleFacetRow): ContactLabelValueFacetRecord {
  return {
    value: row.value,
    valueKey: row.value_key,
    contactCount: row.contact_count
  };
}

function toCategoryFacetRecord(
  row: CategoryFacetRow
): ContactLabelCategoryFacetRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    contactCount: row.contact_count
  };
}

function toTagFacetRecord(row: TagFacetRow): ContactLabelTagFacetRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    contactCount: row.contact_count
  };
}

function toContactFieldRecord(
  row: ContactFieldRow
): ContactLabelBrowserContactFieldRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    containerId: row.container_id,
    label: row.label,
    labelKey: row.label.trim().toLowerCase(),
    value: row.value,
    valueKey: row.value.trim().toLowerCase(),
    type: row.type,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toContainerRecord(row: ContactRow): ContainerRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    categoryId: row.category_id,
    color: row.color,
    isFavorite: row.is_favorite === 1,
    isSystem: row.is_system === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}
