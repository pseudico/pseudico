import type { FeatureModuleContract } from "../featureModuleContract";

export { WorkflowActionExecutor, parseWorkflowActions, stringifyWorkflowActions } from "./WorkflowActionExecutor";
export { WorkflowService } from "./WorkflowService";
export type {
  WorkflowAction,
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
