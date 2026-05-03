import type { FeatureModuleContract } from "../featureModuleContract";
import {
  MetadataBrowserRepository,
  type CategoryWithTargetCountRecord,
  type DatabaseConnection,
  type MetadataTargetRecord,
  type TagWithTargetCountRecord
} from "@local-work-os/db";
import { slugifyTagName } from "@local-work-os/core";

export type ListMetadataTargetsInput = {
  workspaceId: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  tagSlugs?: readonly string[];
};

export class MetadataBrowserService {
  readonly module = "metadata.browser";

  private readonly repository: MetadataBrowserRepository;

  constructor(input: { connection: DatabaseConnection }) {
    this.repository = new MetadataBrowserRepository(input.connection);
  }

  listTagsWithCounts(workspaceId: string): TagWithTargetCountRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return this.repository.listTagsWithCounts(workspaceId);
  }

  listCategoriesWithCounts(
    workspaceId: string
  ): CategoryWithTargetCountRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return this.repository.listCategoriesWithCounts(workspaceId);
  }

  listTargetsByMetadata(
    input: ListMetadataTargetsInput
  ): MetadataTargetRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const tagSlugs = normalizeTagSlugs(input.tagSlugs ?? []);

    if (
      tagSlugs.length === 0 &&
      input.categoryId === undefined &&
      input.categorySlug === undefined
    ) {
      return [];
    }

    if (input.categoryId !== undefined && input.categoryId !== null) {
      validateNonEmptyString(input.categoryId, "categoryId");
    }

    if (input.categorySlug !== undefined && input.categorySlug !== null) {
      validateNonEmptyString(input.categorySlug, "categorySlug");
    }

    return this.repository.listTargetsByMetadata({
      workspaceId: input.workspaceId,
      tagSlugs,
      categoryId: input.categoryId ?? null,
      categorySlug: input.categorySlug ?? null,
      ...(input.includeArchived === undefined
        ? {}
        : { includeArchived: input.includeArchived }),
      ...(input.includeDeleted === undefined
        ? {}
        : { includeDeleted: input.includeDeleted })
    });
  }
}

export const metadataBrowserModuleContract = {
  module: "metadata.browser",
  purpose: "Browse tags, categories, and matching local targets.",
  owns: ["metadata browse queries", "metadata target result shaping"],
  doesNotOwn: ["metadata mutations", "saved-view storage", "collection persistence"],
  integrationPoints: ["tags", "categories", "search", "saved views"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

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

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
