import type { FeatureModuleContract } from "../featureModuleContract";

export { WorkflowActionExecutor } from "./WorkflowActionExecutor";
export type {
  WorkflowAction,
  WorkflowActionRegistryEntry,
  WorkflowDefinitionSchema,
  WorkflowDefinitionSchemaV1,
  WorkflowEditorSkeletonState,
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
export { WorkflowService } from "./WorkflowService";
export type {
  WorkflowActionExecutionContext,
  WorkflowActionExecutionResult,
  WorkflowActionPreview,
  WorkflowServiceIdFactory
} from "./WorkflowActionExecutor";
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
