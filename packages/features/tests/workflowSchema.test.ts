import {
  WORKFLOW_ACTION_REGISTRY,
  WORKFLOW_DEFINITION_KIND,
  WORKFLOW_DEFINITION_SCHEMA_VERSION,
  createWorkflowDefinitionSchema,
  createWorkflowEditorSkeletonState,
  parseWorkflowActions,
  parseWorkflowDefinitionSchema,
  stringifyWorkflowActions,
  validateWorkflowDefinitionSchema
} from "../src";
import { describe, expect, it } from "vitest";

describe("workflow schema and registry", () => {
  it("serializes workflow actions in a versioned local schema envelope", () => {
    const json = stringifyWorkflowActions([
      {
        type: "create_task",
        containerId: "container_1",
        title: "Follow up"
      }
    ]);

    expect(JSON.parse(json)).toMatchObject({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: { type: "manual" },
      actions: [{ type: "create_task", title: "Follow up" }]
    });
    expect(parseWorkflowActions(json)).toEqual([
      {
        type: "create_task",
        containerId: "container_1",
        title: "Follow up"
      }
    ]);
  });

  it("keeps backwards compatibility with legacy action arrays", () => {
    const parsed = parseWorkflowDefinitionSchema(
      JSON.stringify([
        {
          type: "add_tag",
          targetType: "item",
          targetId: "item_1",
          tagName: "Next"
        }
      ])
    );

    expect(parsed).toEqual(
      createWorkflowDefinitionSchema([
        {
          type: "add_tag",
          targetType: "item",
          targetId: "item_1",
          tagName: "Next"
        }
      ])
    );
  });

  it("rejects unsupported non-local triggers and actions before enablement", () => {
    const result = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: { type: "webhook" },
      actions: [
        {
          type: "http_request",
          url: "https://example.com/hook"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.canEnable).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual([
      "Unsupported or non-local workflow trigger: webhook.",
      "Unsupported or non-local workflow action: http_request."
    ]);
  });

  it("exposes only local previewable registered actions", () => {
    expect(WORKFLOW_ACTION_REGISTRY).toHaveLength(5);
    expect(WORKFLOW_ACTION_REGISTRY.every((entry) => entry.localOnly)).toBe(true);
    expect(WORKFLOW_ACTION_REGISTRY.every((entry) => entry.previewable)).toBe(true);
  });

  it("accepts local file-imported triggers with file metadata filters", () => {
    const result = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: {
        type: "file_imported",
        filters: {
          extensions: [".pdf"],
          mimeTypes: ["application/pdf"],
          nameIncludes: "receipt",
          minSizeBytes: 1,
          maxSizeBytes: 1_000_000,
          containerIds: ["container_finance"]
        }
      },
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: "$trigger.itemId",
          tagName: "Receipt"
        }
      ]
    });

    expect(result.valid).toBe(true);
    expect(result.canEnable).toBe(true);
  });

  it("rejects invalid file-imported size filters", () => {
    const result = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: {
        type: "file_imported",
        filters: {
          minSizeBytes: 20,
          maxSizeBytes: 10
        }
      },
      actions: [
        {
          type: "create_task",
          containerId: "container_1",
          title: "Follow up"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toContain(
      "trigger.filters.maxSizeBytes"
    );
  });

  it("accepts local metadata triggers with target and tag/category filters", () => {
    const tagResult = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: {
        type: "tag_added",
        filters: {
          targetTypes: ["item"],
          tagSlugs: ["waiting"]
        }
      },
      actions: [
        {
          type: "move_item",
          itemId: "$trigger.targetId",
          targetContainerId: "container_waiting"
        }
      ]
    });
    const categoryResult = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: {
        type: "category_assigned",
        filters: {
          categoryIds: ["category_finance"]
        }
      },
      actions: [
        {
          type: "create_task",
          containerId: "container_1",
          title: "Review metadata"
        }
      ]
    });

    expect(tagResult.valid).toBe(true);
    expect(categoryResult.valid).toBe(true);
  });


  it("accepts local project/contact template creation workflow actions", () => {
    const result = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: { type: "item_created" },
      actions: [
        {
          type: "create_container_from_template",
          templateId: "template_project_1",
          name: "Project for {{item.title}}",
          baseDate: "{{item.dueAt+1d}}"
        },
        {
          type: "create_task",
          containerId: "{{previous.targetId}}",
          title: "Review {{item.title}}"
        }
      ]
    });

    expect(result.valid).toBe(true);
    expect(createWorkflowEditorSkeletonState({
      name: "Project starter",
      definition: {
        kind: WORKFLOW_DEFINITION_KIND,
        version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
        trigger: { type: "manual" },
        actions: [
          {
            type: "create_container_from_template",
            templateId: "template_project_1",
            name: "Project for {{item.title}}"
          }
        ]
      }
    }).actionSummaries).toEqual([
      "Create project/contact from template template_project_1; name Project for {{item.title}}."
    ]);
  });

  it("accepts templated actions with local conditional steps", () => {
    const result = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: { type: "item_created" },
      actions: [
        {
          type: "create_task",
          containerId: "{{item.containerId}}",
          title: "Follow up {{item.title}} on {{today}}",
          condition: {
            left: "{{item.type}}",
            op: "eq",
            right: "task"
          }
        }
      ]
    });

    expect(result.valid).toBe(true);
  });

  it("rejects invalid conditional workflow step definitions", () => {
    const result = validateWorkflowDefinitionSchema({
      kind: WORKFLOW_DEFINITION_KIND,
      version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
      trigger: { type: "manual" },
      actions: [
        {
          type: "create_task",
          containerId: "container_1",
          title: "Broken condition",
          condition: {
            left: "{{item.title}}",
            op: "eq"
          }
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toContain("actions[0].condition.right");
  });

  it("builds editor skeleton state that disables invalid workflows", () => {
    const state = createWorkflowEditorSkeletonState({
      name: "Webhook draft",
      definition: {
        kind: WORKFLOW_DEFINITION_KIND,
        version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
        trigger: { type: "webhook" },
        actions: []
      }
    });

    expect(state.canEnable).toBe(false);
    expect(state.statusLabel).toBe("Cannot enable until validation issues are fixed");
    expect(state.issues.map((issue) => issue.path)).toEqual([
      "trigger.type",
      "actions"
    ]);
  });
});
