export { CategoryService, categoriesModuleContract } from "./CategoryService";
export { TagService, tagsModuleContract } from "./TagService";
export type {
  AssignCategoryToContainerInput,
  AssignCategoryToItemInput,
  CategoryAssignmentResult,
  CategoryServiceIdFactory,
  CreateCategoryInput,
  DeleteOrArchiveCategoryResult,
  UpdateCategoryInput
} from "./CategoryService";
export type {
  AddTagToTargetInput,
  HydrateItemTagsInput,
  RemoveTagFromTargetInput,
  SyncInlineTagsForNoteInput,
  SyncInlineTagsForTaskInput,
  SyncInlineTagsInput,
  SyncInlineTagsResult,
  TagMutationResult,
  TagServiceIdFactory,
  TaggingTargetInput
} from "./TagService";
