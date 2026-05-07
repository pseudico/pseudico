import { describe, expect, it } from "vitest";
import {
  ImportValidationService,
  type WorkspaceExportV1
} from "../src";

const timestamp = "2026-05-06T00:00:00.000Z";

describe("ImportValidationService", () => {
  it("validates a complete WorkspaceExportV1 summary without applying data", () => {
    const result = new ImportValidationService().validateWorkspaceExportData(
      createWorkspaceExport()
    );

    expect(result).toMatchObject({
      valid: true,
      schemaVersion: 1,
      exportedAt: timestamp,
      workspace: {
        id: "workspace_1",
        name: "Personal Work",
        schemaVersion: 1
      },
      counts: {
        containers: 1,
        items: 4,
        attachments: 1
      },
      attachmentManifest: {
        attachmentCount: 1,
        totalAttachmentBytes: 42
      },
      targetPolicy: {
        mode: "new_workspace_only",
        canApplyToActiveWorkspace: false
      },
      issues: []
    });
  });

  it("reports broken required references", () => {
    const exportData = createWorkspaceExport();
    exportData.data.items[0] = {
      ...exportData.data.items[0],
      containerId: "missing_container"
    };
    exportData.data.taggings[0] = {
      ...exportData.data.taggings[0],
      targetId: "missing_item"
    };

    const result = new ImportValidationService().validateWorkspaceExportData(
      exportData
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_reference",
          path: "$.data.items[0].containerId"
        }),
        expect.objectContaining({
          code: "missing_reference",
          path: "$.data.taggings[0]"
        })
      ])
    );
  });

  it("reports non-object rows as schema errors", () => {
    const exportData = createWorkspaceExport() as unknown as {
      data: { containers: unknown[] };
    };
    exportData.data.containers.push(null);

    const result = new ImportValidationService().validateWorkspaceExportData(
      exportData
    );

    expect(result).toMatchObject({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "invalid_row",
          path: "$.data.containers[1]"
        })
      ]
    });
  });

  it("checks attachment manifest count, total, item reference, and path safety", () => {
    const exportData = createWorkspaceExport();
    exportData.attachmentManifest = {
      attachmentCount: 2,
      totalAttachmentBytes: 1,
      attachments: [
        {
          ...exportData.attachmentManifest.attachments[0],
          itemId: "missing_item",
          storagePath: "../Brief.pdf"
        }
      ]
    };

    const result = new ImportValidationService().validateWorkspaceExportData(
      exportData
    );

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "attachment_count_mismatch",
        "attachment_total_mismatch",
        "missing_reference",
        "unsafe_attachment_path"
      ])
    );
  });

  it("reads and parses a JSON file through the injected file system adapter", async () => {
    const service = new ImportValidationService({
      fileSystem: {
        readTextFile: async () => `${JSON.stringify(createWorkspaceExport())}\n`
      }
    });

    await expect(
      service.validateWorkspaceExportJson("C:\\exports\\workspace.json")
    ).resolves.toMatchObject({
      valid: true,
      sourcePath: "C:\\exports\\workspace.json"
    });
  });

  it("returns a validation error for invalid JSON", async () => {
    const service = new ImportValidationService({
      fileSystem: {
        readTextFile: async () => "{"
      }
    });

    const result = await service.validateWorkspaceExportJson(
      "C:\\exports\\workspace.json"
    );

    expect(result).toMatchObject({
      valid: false,
      issues: [
        {
          severity: "error",
          code: "invalid_json"
        }
      ]
    });
  });
});

function createWorkspaceExport(): WorkspaceExportV1 {
  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    workspace: {
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    data: {
      containers: [
        {
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: "category_1",
          color: null,
          isFavorite: false,
          isSystem: false,
          sortOrder: 10,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          deletedAt: null
        }
      ],
      containerTabs: [
        {
          id: "tab_1",
          workspaceId: "workspace_1",
          containerId: "container_1",
          name: "Main",
          description: null,
          sortOrder: 10,
          isDefault: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          deletedAt: null
        }
      ],
      items: [
        createItem("item_task_1", "task"),
        createItem("item_note_1", "note"),
        createItem("item_list_1", "list"),
        createItem("item_file_1", "file")
      ],
      taskDetails: [
        {
          itemId: "item_task_1",
          workspaceId: "workspace_1",
          taskStatus: "open",
          priority: 2,
          startAt: null,
          dueAt: null,
          allDay: true,
          timezone: null,
          reminderPolicyId: null,
          recurrenceRuleId: null,
          completedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      noteDetails: [
        {
          itemId: "item_note_1",
          workspaceId: "workspace_1",
          format: "markdown",
          content: "# Notes",
          preview: "Notes",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      listDetails: [
        {
          itemId: "item_list_1",
          workspaceId: "workspace_1",
          displayMode: "checklist",
          showCompleted: true,
          progressMode: "count",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      listItems: [
        {
          id: "list_item_1",
          workspaceId: "workspace_1",
          listItemParentId: null,
          listId: "item_list_1",
          title: "Confirm export",
          body: null,
          status: "open",
          depth: 0,
          sortOrder: 10,
          startAt: null,
          dueAt: null,
          completedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          deletedAt: null
        }
      ],
      linkDetails: [],
      tags: [
        {
          id: "tag_1",
          workspaceId: "workspace_1",
          name: "Launch",
          slug: "launch",
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null
        }
      ],
      taggings: [
        {
          id: "tagging_1",
          workspaceId: "workspace_1",
          tagId: "tag_1",
          targetType: "item",
          targetId: "item_task_1",
          source: "manual",
          createdAt: timestamp,
          deletedAt: null
        }
      ],
      categories: [
        {
          id: "category_1",
          workspaceId: "workspace_1",
          name: "Operations",
          slug: "operations",
          color: "#2c6b8f",
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null
        }
      ],
      relationships: [
        {
          id: "relationship_1",
          workspaceId: "workspace_1",
          sourceType: "item",
          sourceId: "item_task_1",
          targetType: "item",
          targetId: "item_note_1",
          relationType: "related",
          label: null,
          createdAt: timestamp,
          deletedAt: null
        }
      ],
      savedViews: [
        {
          id: "saved_view_1",
          workspaceId: "workspace_1",
          type: "collection",
          name: "Launch",
          description: null,
          queryJson: "{}",
          displayJson: "{}",
          isFavorite: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null
        }
      ],
      dashboards: [
        {
          id: "dashboard_1",
          workspaceId: "workspace_1",
          name: "Dashboard",
          isDefault: true,
          layoutJson: "{}",
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null
        }
      ],
      dashboardWidgets: [
        {
          id: "dashboard_widget_1",
          workspaceId: "workspace_1",
          dashboardId: "dashboard_1",
          type: "today",
          title: "Today",
          savedViewId: "saved_view_1",
          configJson: "{}",
          positionJson: "{}",
          sortOrder: 10,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null
        }
      ],
      dailyPlans: [
        {
          id: "daily_plan_1",
          workspaceId: "workspace_1",
          planDate: "2026-05-06",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      dailyPlanItems: [
        {
          id: "daily_plan_item_1",
          workspaceId: "workspace_1",
          dailyPlanId: "daily_plan_1",
          itemType: "task",
          itemId: "item_task_1",
          lane: "today",
          sortOrder: 10,
          addedManually: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]
    },
    attachmentManifest: {
      attachmentCount: 1,
      totalAttachmentBytes: 42,
      attachments: [
        {
          id: "attachment_1",
          itemId: "item_file_1",
          originalName: "Brief.pdf",
          storedName: "Brief.pdf",
          mimeType: "application/pdf",
          sizeBytes: 42,
          checksum: "a".repeat(64),
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
          description: "Launch brief",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]
    }
  };
}

function createItem(id: string, type: string): WorkspaceExportV1["data"]["items"][number] {
  return {
    id,
    workspaceId: "workspace_1",
    containerId: "container_1",
    containerTabId: "tab_1",
    type,
    title: id,
    body: null,
    categoryId: "category_1",
    status: "open",
    sortOrder: 10,
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    archivedAt: null,
    deletedAt: null
  };
}
