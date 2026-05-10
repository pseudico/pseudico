import type { FeatureModuleContract } from "../featureModuleContract";
import { slugifyTagName } from "@local-work-os/core";
import {
  ProjectTagBrowserRepository,
  TagRepository,
  type DatabaseConnection,
  type ProjectCategoryFacetRecord,
  type ProjectStatusFacetRecord,
  type ProjectTagBrowserProjectRecord,
  type ProjectTagBrowserStatus,
  type ProjectTagFacetRecord,
  type TagRecord
} from "@local-work-os/db";

export type ProjectTagBrowserInput = {
  workspaceId: string;
  tagSlugs?: readonly string[];
  categoryId?: string | null;
  status?: ProjectTagBrowserStatus | null;
};

export type ProjectTagBrowserFilters = {
  tagSlugs: string[];
  categoryId: string | null;
  status: ProjectTagBrowserStatus | null;
};

export type ProjectTagBrowserViewModel = {
  workspaceId: string;
  generatedAt: string;
  filters: ProjectTagBrowserFilters;
  selectedTags: TagRecord[];
  tagFacets: ProjectTagFacetRecord[];
  categoryFacets: ProjectCategoryFacetRecord[];
  statusFacets: ProjectStatusFacetRecord[];
  projects: ProjectTagBrowserProjectRecord[];
  totalProjectCount: number;
};

export class ProjectTagBrowserService {
  readonly module = "metadata.projectTagBrowser";

  private readonly repository: ProjectTagBrowserRepository;
  private readonly tags: TagRepository;
  private readonly now: () => Date;

  constructor(input: { connection: DatabaseConnection; now?: () => Date }) {
    this.repository = new ProjectTagBrowserRepository(input.connection);
    this.tags = new TagRepository(input.connection);
    this.now = input.now ?? (() => new Date());
  }

  getViewModel(input: ProjectTagBrowserInput): ProjectTagBrowserViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const filters = normalizeFilters(input);
    const repositoryInput = {
      workspaceId: input.workspaceId,
      tagSlugs: filters.tagSlugs,
      categoryId: filters.categoryId,
      status: filters.status
    };
    const projects = this.repository.listProjects(repositoryInput);

    return {
      workspaceId: input.workspaceId,
      generatedAt: this.now().toISOString(),
      filters,
      selectedTags: this.resolveSelectedTags(input.workspaceId, filters.tagSlugs),
      tagFacets: this.repository.listTagFacets(repositoryInput),
      categoryFacets: this.repository.listCategoryFacets(repositoryInput),
      statusFacets: this.repository.listStatusFacets(repositoryInput),
      projects,
      totalProjectCount: projects.length
    };
  }

  private resolveSelectedTags(workspaceId: string, tagSlugs: readonly string[]): TagRecord[] {
    return tagSlugs
      .map((slug) => this.tags.findBySlug({ workspaceId, slug }))
      .filter((tag): tag is TagRecord => tag !== null);
  }
}

export const projectTagBrowserModuleContract = {
  module: "metadata.projectTagBrowser",
  purpose: "Browse project containers by hierarchical tag facets and project filters.",
  owns: ["project tag facet queries", "multi-tag project narrowing", "project filter result shaping"],
  doesNotOwn: ["tag mutations", "general metadata browsing", "cloud taxonomy"],
  integrationPoints: ["projects", "tags", "categories", "renderer navigation"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function normalizeFilters(input: ProjectTagBrowserInput): ProjectTagBrowserFilters {
  return {
    tagSlugs: normalizeTagSlugs(input.tagSlugs ?? []),
    categoryId: normalizeOptionalString(input.categoryId ?? null, "categoryId"),
    status: normalizeStatus(input.status ?? null)
  };
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

function normalizeOptionalString(value: string | null, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  validateNonEmptyString(value, fieldName);
  return value;
}

function normalizeStatus(value: ProjectTagBrowserStatus | null): ProjectTagBrowserStatus | null {
  if (value === null) {
    return null;
  }

  if (["active", "waiting", "completed", "archived"].includes(value)) {
    return value;
  }

  throw new Error("status must be active, waiting, completed, or archived.");
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
