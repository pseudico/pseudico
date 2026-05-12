import type { FeatureModuleContract } from "../featureModuleContract";

export {
  WorkflowActionExecutor,
  WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
  WORKFLOW_TRIGGER_TARGET_ID_TOKEN
} from "./WorkflowActionExecutor";
export { WorkflowTriggerService } from "./WorkflowTriggerService";
export type {
  WorkflowAction,
  WorkflowActionCondition,
  WorkflowActionConditionOperator,
  WorkflowActionRegistryEntry,
  WorkflowDefinitionSchema,
  WorkflowDefinitionSchemaV1,
  WorkflowEditorSkeletonState,
  WorkflowFileImportedTriggerFilters,
  WorkflowItemCreatedTriggerFilters,
  WorkflowMetadataTriggerFilters,
  WorkflowTrigger,
  WorkflowTriggerRegistryEntry,
  WorkflowValidationIssue,
  WorkflowValidationResult
} from "./WorkflowSchema";
export {
  WORKFLOW_ACTION_REGISTRY,
  WORKFLOW_DEFINITION_KIND,
  WORKFLOW_DEFINITION_SCHEMA_VERSION,
  WORKFLOW_TRIGGER_REGISTRY,
  createWorkflowDefinitionSchema,
  createWorkflowEditorSkeletonState,
  getWorkflowActionRegistryEntry,
  getWorkflowTriggerRegistryEntry,
  parseWorkflowActions,
  parseWorkflowDefinitionSchema,
  stringifyWorkflowActions,
  stringifyWorkflowDefinitionSchema,
  summarizeWorkflowAction,
  validateWorkflowActions,
  validateWorkflowDefinitionSchema
} from "./WorkflowSchema";
export { WorkflowVariableResolver } from "./WorkflowVariableResolver";
export type {
  WorkflowActionResolution,
  WorkflowConditionEvaluation,
  WorkflowStringResolution,
  WorkflowVariableInterpolation,
  WorkflowVariableResolutionContext
} from "./WorkflowVariableResolver";
export { WorkflowService } from "./WorkflowService";
export type {
  WorkflowActionExecutionContext,
  WorkflowActionExecutionResult,
  WorkflowActionPreview,
  WorkflowServiceIdFactory
} from "./WorkflowActionExecutor";
export type {
  ItemCreatedWorkflowEvent,
  ItemCreatedWorkflowRunResult,
  FileImportedWorkflowEvent,
  FileImportedWorkflowRunResult,
  TagWorkflowEvent,
  CategoryAssignedWorkflowEvent,
  MetadataWorkflowRunResult,
  TriggeredWorkflowRunResult
} from "./WorkflowTriggerService";
export type {
  CreateWorkflowInput,
  PreviewWorkflowRunInput,
  RunManualWorkflowInput,
  WorkflowPreviewResult,
  WorkflowRunResult
} from "./WorkflowService";

export const workflowsModuleContract: FeatureModuleContract = {
  module: "workflows",
  purpose:
    "Define and run local manual workflows with previewed, service-backed actions.",
  owns: ["manual workflow definitions", "run previews", "workflow run records"],
  doesNotOwn: ["scheduled automation", "cloud workflows", "external integrations"],
  integrationPoints: ["metadata", "items", "tasks", "activity", "search"],
  priority: "V2"
} as const satisfies FeatureModuleContract;
