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
export { WorkflowRunHistoryService } from "./WorkflowRunHistoryService";
export type {
  WorkflowActionResolution,
  WorkflowConditionEvaluation,
  WorkflowStringResolution,
  WorkflowVariableInterpolation,
  WorkflowVariableResolutionContext
} from "./WorkflowVariableResolver";
export { WorkflowService } from "./WorkflowService";
export {
  GUIDED_WORKFLOW_TEMPLATES,
  HOUSE_RENOVATION_CONTACTS,
  HOUSE_RENOVATION_PROJECT_ID,
  HOUSE_RENOVATION_PROJECT_NAME,
  HOUSE_RENOVATION_WORKSPACE_ID,
  getGuidedWorkflowTemplate,
  getHouseRenovationContact,
  listGuidedWorkflowTemplates
} from "./GuidedWorkflowTemplates";
export type {
  GuidedWorkflowField,
  GuidedWorkflowTemplate,
  GuidedWorkflowTemplateId
} from "./GuidedWorkflowTemplates";
export {
  GuidedWorkflowService,
  guidedWorkflowsModuleContract
} from "./GuidedWorkflowService";
export type {
  WorkflowActionExecutionContext,
  WorkflowActionExecutionResult,
  WorkflowActionPreview,
  WorkflowServiceIdFactory
} from "./WorkflowActionExecutor";
export type {
  ListWorkflowRunHistoryInput,
  RollbackWorkflowRunInput,
  WorkflowRunDiagnostics,
  WorkflowRunHistoryAction,
  WorkflowRunHistoryEntry,
  WorkflowRunHistoryServiceIdFactory,
  WorkflowRunRollbackResult
} from "./WorkflowRunHistoryService";
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
export type {
  ExecuteGuidedWorkflowInput,
  GuidedWorkflowActionResult,
  GuidedWorkflowCreatedLink,
  GuidedWorkflowExecutionResult,
  GuidedWorkflowInput,
  GuidedWorkflowPlannedChange,
  GuidedWorkflowPreview,
  GuidedWorkflowRunHistoryEntry,
  GuidedWorkflowServiceIdFactory
} from "./GuidedWorkflowService";

export const workflowsModuleContract: FeatureModuleContract = {
  module: "workflows",
  purpose:
    "Define and run local workflows with previewed actions, run history, diagnostics, and safe rollback hooks.",
  owns: ["workflow definitions", "run previews", "workflow run records", "run rollback diagnostics"],
  doesNotOwn: ["scheduled automation", "cloud workflows", "external integrations"],
  integrationPoints: ["metadata", "items", "tasks", "activity", "search"],
  priority: "V2"
} as const satisfies FeatureModuleContract;
