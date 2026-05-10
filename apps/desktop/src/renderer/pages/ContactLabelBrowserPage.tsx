import { Building2, ChevronRight, Contact, MapPin, RefreshCw, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CategoryBadge, TagBadge } from "@local-work-os/ui";
import type {
  ContactLabelBrowserGroupBy,
  ContactLabelBrowserStatus,
  ContactLabelBrowserSummary,
  LocalWorkOsApi
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ContactLabelBrowserPageProps = {
  apiClient?: LocalWorkOsApi;
  initialViewModel?: ContactLabelBrowserSummary | null;
};

type ParsedContactBrowserFilters = {
  fieldFilters: Array<{ label: string; value: string }>;
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

export function ContactLabelBrowserPage({
  apiClient = desktopApiClient,
  initialViewModel = null
}: ContactLabelBrowserPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewModel, setViewModel] = useState<ContactLabelBrowserSummary | null>(
    initialViewModel
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const hasActiveFilter =
    filters.fieldFilters.length > 0 ||
    filters.company !== null ||
    filters.role !== null ||
    filters.location !== null ||
    filters.emailDomain !== null ||
    filters.tagSlugs.length > 0 ||
    filters.categoryId !== null ||
    filters.status !== null;

  const updateFilters = useCallback(
    (next: ParsedContactBrowserFilters): void => {
      setSearchParams(serializeFilters(next), { replace: true });
    },
    [setSearchParams]
  );

  const loadBrowser = useCallback(
    async (workspaceId: string, nextFilters: ParsedContactBrowserFilters): Promise<void> => {
      setLoading(true);
      setError(null);

      const result = await apiClient.metadata.getContactLabelBrowser({
        workspaceId,
        ...nextFilters
      });

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setViewModel(result.data);
    },
    [apiClient]
  );

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    apiClient.metadata
      .getContactLabelBrowser({
        workspaceId: currentWorkspace.id,
        ...filters
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setLoading(false);

        if (!result.ok) {
          setError(result.error.message);
          return;
        }

        setViewModel(result.data);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }

        setLoading(false);
        setError(caught instanceof Error ? caught.message : "Contact label browser failed.");
      });

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, filters]);

  function toggleField(label: string, value: string): void {
    const exists = filters.fieldFilters.some(
      (filter) => filter.label === label && filter.value === value
    );
    const fieldFilters = exists
      ? filters.fieldFilters.filter(
          (filter) => filter.label !== label || filter.value !== value
        )
      : [...filters.fieldFilters, { label, value }];

    updateFilters({
      ...filters,
      fieldFilters,
      groupBy: "field",
      fieldGroupLabel: label
    });
  }

  function toggleTag(tagSlug: string): void {
    const tagSlugs = filters.tagSlugs.includes(tagSlug)
      ? filters.tagSlugs.filter((slug) => slug !== tagSlug)
      : [...filters.tagSlugs, tagSlug].sort();

    updateFilters({ ...filters, tagSlugs, groupBy: "tag" });
  }

  if (currentWorkspace === null && initialViewModel === null) {
    return (
      <section className="metadata-page contact-label-browser-page">
        <div className="page-heading">
          <p className="top-eyebrow">Contact labels</p>
          <h2>Contact Label Browser</h2>
          <p>Open or create a local workspace before browsing contact labels.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="metadata-page contact-label-browser-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Contact labels</p>
          <h2>Contact Label Browser</h2>
          <p>
            Browse local contacts by flexible labels, company, role, location,
            email domain, tags, categories, and grouped CRM slices.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={loading || currentWorkspace === null}
          type="button"
          onClick={() => {
            if (currentWorkspace !== null) {
              void loadBrowser(currentWorkspace.id, filters);
            }
          }}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error === null ? null : <p className="form-message form-message-error">{error}</p>}

      <div className="project-browser-breadcrumbs" aria-label="Active contact filters">
        <span>All contacts</span>
        {filters.fieldFilters.map((field) => (
          <span key={`${field.label}:${field.value}`} className="project-browser-crumb">
            <ChevronRight size={14} aria-hidden="true" />
            {field.label}: {field.value}
          </span>
        ))}
        {filters.company === null ? null : <Crumb label={`Company: ${filters.company}`} />}
        {filters.role === null ? null : <Crumb label={`Role: ${filters.role}`} />}
        {filters.location === null ? null : <Crumb label={`Location: ${filters.location}`} />}
        {filters.emailDomain === null ? null : (
          <Crumb label={`Email domain: ${filters.emailDomain}`} />
        )}
        {viewModel?.selectedTags.map((tag) => (
          <span key={tag.id} className="project-browser-crumb">
            <ChevronRight size={14} aria-hidden="true" />@{tag.slug}
          </span>
        ))}
      </div>

      <div className="metadata-browser-layout project-tag-browser-layout">
        <aside className="metadata-filter-panel" aria-label="Contact label facets">
          <div className="panel-heading">
            <Contact size={17} aria-hidden="true" />
            <h3>Contact facets</h3>
          </div>

          <FacetSection title="Company" icon={<Building2 size={16} aria-hidden="true" />}>
            <ValueFacetButtons
              facets={viewModel?.companyFacets ?? []}
              selected={filters.company}
              disabled={loading}
              onSelect={(value) =>
                updateFilters({ ...filters, company: value, groupBy: "company" })
              }
            />
          </FacetSection>

          <FacetSection title="Role" icon={<Contact size={16} aria-hidden="true" />}>
            <ValueFacetButtons
              facets={viewModel?.roleFacets ?? []}
              selected={filters.role}
              disabled={loading}
              onSelect={(value) =>
                updateFilters({ ...filters, role: value, groupBy: "role" })
              }
            />
          </FacetSection>

          <FacetSection title="Location" icon={<MapPin size={16} aria-hidden="true" />}>
            <ValueFacetButtons
              facets={viewModel?.locationFacets ?? []}
              selected={filters.location}
              disabled={loading}
              onSelect={(value) =>
                updateFilters({ ...filters, location: value, groupBy: "location" })
              }
            />
          </FacetSection>

          <FacetSection title="Email domains" icon={<Contact size={16} aria-hidden="true" />}>
            <ValueFacetButtons
              facets={viewModel?.emailDomainFacets ?? []}
              selected={filters.emailDomain}
              disabled={loading}
              onSelect={(value) =>
                updateFilters({
                  ...filters,
                  emailDomain: value,
                  groupBy: "emailDomain"
                })
              }
            />
          </FacetSection>

          <FacetSection title="Custom labels" icon={<Tags size={16} aria-hidden="true" />}>
            <div className="metadata-chip-list">
              {(viewModel?.fieldFacets ?? []).length === 0 ? (
                <p className="muted-text">No contact fields match this filter.</p>
              ) : (
                viewModel!.fieldFacets.map((facet) => (
                  <button
                    type="button"
                    key={`${facet.labelKey}:${facet.valueKey}:${facet.type}`}
                    className="metadata-chip"
                    aria-pressed={filters.fieldFilters.some(
                      (field) =>
                        field.label.toLowerCase() === facet.labelKey &&
                        field.value.toLowerCase() === facet.valueKey
                    )}
                    disabled={loading}
                    onClick={() => toggleField(facet.label, facet.value)}
                  >
                    <span>
                      {facet.label}: {facet.value}
                    </span>
                    <span>{facet.contactCount}</span>
                  </button>
                ))
              )}
            </div>
          </FacetSection>

          <FacetSection title="Tags" icon={<Tags size={16} aria-hidden="true" />}>
            <div className="metadata-chip-list">
              {(viewModel?.tagFacets ?? []).map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  className="metadata-chip"
                  aria-pressed={filters.tagSlugs.includes(tag.slug)}
                  disabled={loading}
                  onClick={() => toggleTag(tag.slug)}
                >
                  <span>@{tag.name}</span>
                  <span>{tag.contactCount}</span>
                </button>
              ))}
            </div>
          </FacetSection>

          <FacetSection title="Categories" icon={<Tags size={16} aria-hidden="true" />}>
            <div className="metadata-category-list">
              <button
                type="button"
                className="metadata-category-option"
                aria-pressed={filters.categoryId === null}
                disabled={loading}
                onClick={() => updateFilters({ ...filters, categoryId: null })}
              >
                <CategoryBadge category={null} fallbackLabel="Any category" />
              </button>
              {(viewModel?.categoryFacets ?? []).map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className="metadata-category-option"
                  aria-pressed={filters.categoryId === category.id}
                  disabled={loading}
                  onClick={() =>
                    updateFilters({ ...filters, categoryId: category.id, groupBy: "category" })
                  }
                >
                  <CategoryBadge category={category} />
                  <span>{category.contactCount}</span>
                </button>
              ))}
            </div>
          </FacetSection>

          <FacetSection title="Status" icon={<Contact size={16} aria-hidden="true" />}>
            <div className="metadata-chip-list">
              <button
                type="button"
                className="metadata-chip"
                aria-pressed={filters.status === null}
                disabled={loading}
                onClick={() => updateFilters({ ...filters, status: null })}
              >
                <span>Any unarchived status</span>
                <span>{viewModel?.contacts.length ?? 0}</span>
              </button>
              {(viewModel?.statusFacets ?? []).map((status) => (
                <button
                  type="button"
                  key={status.status}
                  className="metadata-chip"
                  aria-pressed={filters.status === status.status}
                  disabled={loading}
                  onClick={() =>
                    updateFilters({ ...filters, status: status.status, groupBy: "status" })
                  }
                >
                  <span>{formatStatus(status.status)}</span>
                  <span>{status.contactCount}</span>
                </button>
              ))}
            </div>
          </FacetSection>

          <button
            type="button"
            className="secondary-button compact-button"
            disabled={loading || !hasActiveFilter}
            onClick={() => updateFilters(defaultFilters())}
          >
            Clear browser state
          </button>
        </aside>

        <section className="metadata-results-panel" aria-busy={loading}>
          <div className="metadata-results-heading">
            <div>
              <p className="top-eyebrow">Matching contacts</p>
              <h3>{formatContactSelection(filters)}</h3>
            </div>
            <span>
              {viewModel?.totalContactCount ?? 0} contact
              {(viewModel?.totalContactCount ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          {loading && viewModel === null ? (
            <p className="muted-text">Loading contact label browser...</p>
          ) : (viewModel?.contacts ?? []).length === 0 ? (
            <div className="item-feed-empty-state">
              <h3>No matching contacts</h3>
              <p>Select a different label, value, tag, category, or status filter.</p>
            </div>
          ) : (
            <div className="contact-browser-groups" aria-label="Grouped contact label results">
              {viewModel!.groups.map((group) => (
                <section key={group.key} className="metadata-result-group">
                  <div className="metadata-results-heading">
                    <h4>{group.label}</h4>
                    <span>
                      {group.contactCount} contact{group.contactCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="project-list">
                    {group.contacts.map((contact) => (
                      <article className="project-browser-result" key={contact.id}>
                        <span
                          className="project-list-color"
                          style={{ backgroundColor: contact.color ?? "#2c6b8f" }}
                          aria-hidden="true"
                        />
                        <div className="project-list-main">
                          <Link className="text-link" to={`/contacts/${contact.id}`}>
                            <strong>{contact.name}</strong>
                          </Link>
                          <span>{contact.description ?? "No description"}</span>
                          <div className="metadata-target-metadata">
                            <span>{formatStatus(contact.status)}</span>
                            <CategoryBadge
                              category={contact.category}
                              fallbackLabel="No category"
                            />
                            {contact.tags.map((tag) => (
                              <TagBadge key={tag.id} tag={tag} />
                            ))}
                          </div>
                          <div className="metadata-chip-list">
                            {contact.fields.slice(0, 5).map((field) => (
                              <span
                                key={field.id}
                                className="metadata-chip static-chip"
                              >
                                {field.label}: {field.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function Crumb({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="project-browser-crumb">
      <ChevronRight size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

function FacetSection({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className="metadata-filter-group" aria-labelledby={`contact-${title}`}>
      <div className="metadata-filter-title">
        {icon}
        <h4 id={`contact-${title}`}>{title}</h4>
      </div>
      {children}
    </section>
  );
}

function ValueFacetButtons({
  facets,
  selected,
  disabled,
  onSelect
}: {
  facets: readonly { value: string; valueKey: string; contactCount: number }[];
  selected: string | null;
  disabled: boolean;
  onSelect: (value: string | null) => void;
}): React.JSX.Element {
  return (
    <div className="metadata-chip-list">
      {facets.length === 0 ? (
        <p className="muted-text">No matching values.</p>
      ) : (
        facets.map((facet) => (
          <button
            type="button"
            key={facet.valueKey}
            className="metadata-chip"
            aria-pressed={selected === facet.valueKey}
            disabled={disabled}
            onClick={() => onSelect(selected === facet.valueKey ? null : facet.valueKey)}
          >
            <span>{facet.value}</span>
            <span>{facet.contactCount}</span>
          </button>
        ))
      )}
    </div>
  );
}

function parseFilters(params: URLSearchParams): ParsedContactBrowserFilters {
  return {
    fieldFilters: params.getAll("field").map(parseFieldFilter).filter(isFieldFilter),
    company: params.get("company"),
    role: params.get("role"),
    location: params.get("location"),
    emailDomain: params.get("emailDomain"),
    tagSlugs: parseCsv(params.get("tags")),
    categoryId: params.get("categoryId"),
    status: parseStatus(params.get("status")),
    groupBy: parseGroupBy(params.get("groupBy")),
    fieldGroupLabel: params.get("fieldGroupLabel")
  };
}

function serializeFilters(filters: ParsedContactBrowserFilters): URLSearchParams {
  const params = new URLSearchParams();

  for (const field of filters.fieldFilters) {
    params.append("field", `${field.label}:${field.value}`);
  }

  for (const [key, value] of [
    ["company", filters.company],
    ["role", filters.role],
    ["location", filters.location],
    ["emailDomain", filters.emailDomain],
    ["categoryId", filters.categoryId],
    ["status", filters.status],
    ["fieldGroupLabel", filters.fieldGroupLabel]
  ] as const) {
    if (value !== null && value.length > 0) {
      params.set(key, value);
    }
  }

  if (filters.tagSlugs.length > 0) {
    params.set("tags", filters.tagSlugs.join(","));
  }

  if (filters.groupBy !== "company") {
    params.set("groupBy", filters.groupBy);
  }

  return params;
}

function parseFieldFilter(value: string): { label: string; value: string } | null {
  const separator = value.indexOf(":");

  if (separator <= 0 || separator === value.length - 1) {
    return null;
  }

  return {
    label: value.slice(0, separator),
    value: value.slice(separator + 1)
  };
}

function isFieldFilter(value: { label: string; value: string } | null): value is {
  label: string;
  value: string;
} {
  return value !== null;
}

function parseCsv(value: string | null): string[] {
  return value === null || value.trim().length === 0
    ? []
    : [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))].sort();
}

function parseStatus(value: string | null): ContactLabelBrowserStatus | null {
  return value === "active" ||
    value === "waiting" ||
    value === "completed" ||
    value === "archived"
    ? value
    : null;
}

function parseGroupBy(value: string | null): ContactLabelBrowserGroupBy {
  return value === "role" ||
    value === "location" ||
    value === "emailDomain" ||
    value === "category" ||
    value === "tag" ||
    value === "status" ||
    value === "field"
    ? value
    : "company";
}

function defaultFilters(): ParsedContactBrowserFilters {
  return {
    fieldFilters: [],
    company: null,
    role: null,
    location: null,
    emailDomain: null,
    tagSlugs: [],
    categoryId: null,
    status: null,
    groupBy: "company",
    fieldGroupLabel: null
  };
}

function formatContactSelection(filters: ParsedContactBrowserFilters): string {
  const parts = [
    ...filters.fieldFilters.map((field) => `${field.label}: ${field.value}`),
    ...(filters.company === null ? [] : [`Company ${filters.company}`]),
    ...(filters.role === null ? [] : [`Role ${filters.role}`]),
    ...(filters.location === null ? [] : [`Location ${filters.location}`]),
    ...(filters.emailDomain === null ? [] : [`Domain ${filters.emailDomain}`]),
    ...filters.tagSlugs.map((slug) => `@${slug}`),
    ...(filters.categoryId === null ? [] : ["category"]),
    ...(filters.status === null ? [] : [formatStatus(filters.status)])
  ];

  return parts.length === 0 ? "All active contacts" : parts.join(" + ");
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
