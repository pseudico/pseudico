import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiOk, type LocalWorkOsApi, type TemplateSummary } from "../../src/preload/api";
import { TemplatesPage } from "../../src/renderer/pages/TemplatesPage";

describe("TemplatesPage", () => {
  it("renders a filterable local template manager with preview counts", () => {
    const html = renderToString(
      <MemoryRouter>
        <TemplatesPage apiClient={createMockApi()} initialTemplates={[template]} />
      </MemoryRouter>
    );

    expect(html).toContain("Local template manager");
    expect(html).toContain("Export pack");
    expect(html).toContain("Import pack");
    expect(html).toContain("Client launch");
    expect(html).toContain("Project");
    expect(html).toContain("Schedule kickoff");
    expect(html).toContain("Client");
  });
});

const template: TemplateSummary = {
  id: "template_project",
  workspaceId: "workspace_1",
  kind: "project",
  name: "Client launch",
  description: "Repeatable kickoff project",
  sourceType: "project",
  sourceId: "container_project_1",
  templateJson: JSON.stringify({
    version: 1,
    kind: "project",
    container: {
      name: "Client launch",
      tags: [{ name: "Client" }],
      contactFields: [],
      tabs: [{ name: "Plan" }],
      items: [
        {
          type: "task",
          title: "Schedule kickoff",
          tags: []
        }
      ]
    }
  }),
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  deletedAt: null
};

function createMockApi(): LocalWorkOsApi {
  return {
    templates: {
      listTemplates: async () => apiOk([template]),
      saveContainerAsTemplate: async () => apiOk(template),
      createContainerFromTemplate: async () =>
        apiOk({
          template,
          container: {
            id: "container_project_2",
            workspaceId: "workspace_1",
            type: "project",
            name: "Client launch",
            slug: "client-launch",
            description: null,
            status: "active",
            categoryId: null,
            color: null,
            isFavorite: false,
            sortOrder: 0,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            archivedAt: null,
            deletedAt: null
          },
          tabs: [],
          itemIds: []
        }),
      updateTemplate: async () => apiOk(template),
      duplicateTemplate: async () => apiOk({ ...template, id: "template_copy" }),
      deleteTemplate: async () =>
        apiOk({
          ...template,
          deletedAt: "2026-05-02T00:00:00.000Z"
        }),
      exportTemplatePack: async () =>
        apiOk({
          id: "export_1",
          workspaceId: "workspace_1",
          createdAt: "2026-05-02T00:00:00.000Z",
          relativePath: "exports/templates/template-library-pack.lwo-template-pack",
          sizeBytes: 1234,
          fileVersion: 1,
          name: "Template library pack",
          templateCount: 1,
          templateIds: ["template_project"]
        }),
      validateTemplatePack: async () =>
        apiOk({
          valid: true,
          sourcePath: "template-pack.lwo-template-pack",
          fileVersion: 1,
          exportedAt: "2026-05-02T00:00:00.000Z",
          name: "Template library pack",
          description: null,
          templateCount: 1,
          capabilities: {
            tabs: true,
            tasks: true,
            notes: false,
            lists: false,
            links: false,
            filePlaceholders: false,
            tags: true,
            categories: false,
            relativeDates: false,
            contactFields: false
          },
          counts: {
            tabs: 1,
            items: 1,
            tasks: 1,
            notes: 0,
            lists: 0,
            links: 0,
            filePlaceholders: 0,
            listItems: 0,
            tags: 1,
            categories: 0
          },
          templates: [],
          issues: []
        }),
      importTemplatePack: async () =>
        apiOk({
          workspaceId: "workspace_1",
          importedAt: "2026-05-02T00:00:00.000Z",
          templateCount: 1,
          importedTemplates: [template]
        }),
      chooseAndImportTemplatePack: async () =>
        apiOk({
          workspaceId: "workspace_1",
          importedAt: "2026-05-02T00:00:00.000Z",
          templateCount: 1,
          importedTemplates: [template]
        })
    },
    projects: {
      list: async () => apiOk([]),
      create: async () => {
        throw new Error("not used");
      },
      update: async () => {
        throw new Error("not used");
      },
      archive: async () => {
        throw new Error("not used");
      },
      softDelete: async () => {
        throw new Error("not used");
      },
      get: async () => {
        throw new Error("not used");
      },
      getHealth: async () => {
        throw new Error("not used");
      },
      createProject: async () => {
        throw new Error("not used");
      },
      updateProject: async () => {
        throw new Error("not used");
      },
      archiveProject: async () => {
        throw new Error("not used");
      },
      softDeleteProject: async () => {
        throw new Error("not used");
      },
      listProjects: async () => apiOk([]),
      getProject: async () => {
        throw new Error("not used");
      },
      getProjectHealth: async () => {
        throw new Error("not used");
      }
    },
    contacts: {
      list: async () => apiOk([]),
      create: async () => {
        throw new Error("not used");
      },
      update: async () => {
        throw new Error("not used");
      },
      get: async () => {
        throw new Error("not used");
      },
      addField: async () => {
        throw new Error("not used");
      },
      updateField: async () => {
        throw new Error("not used");
      },
      createContact: async () => {
        throw new Error("not used");
      },
      updateContact: async () => {
        throw new Error("not used");
      },
      listContacts: async () => apiOk([]),
      getContact: async () => {
        throw new Error("not used");
      }
    },
    lists: {
      createFromTemplate: async () => {
        throw new Error("not used");
      },
      listTemplates: async () => apiOk([]),
      create: async () => {
        throw new Error("not used");
      },
      addItem: async () => {
        throw new Error("not used");
      },
      updateItem: async () => {
        throw new Error("not used");
      },
      completeItem: async () => {
        throw new Error("not used");
      },
      reopenItem: async () => {
        throw new Error("not used");
      },
      enablePipelineMode: async () => {
        throw new Error("not used");
      },
      disablePipelineMode: async () => {
        throw new Error("not used");
      },
      getPipelineViewModel: async () => {
        throw new Error("not used");
      },
      movePipelineCard: async () => {
        throw new Error("not used");
      },
      indentItem: async () => {
        throw new Error("not used");
      },
      outdentItem: async () => {
        throw new Error("not used");
      },
      moveItem: async () => {
        throw new Error("not used");
      },
      moveItemToList: async () => {
        throw new Error("not used");
      },
      bulkAddItems: async () => {
        throw new Error("not used");
      },
      bulkUpdateItems: async () => {
        throw new Error("not used");
      },
      listByContainer: async () => apiOk([]),
      createList: async () => {
        throw new Error("not used");
      },
      saveAsTemplate: async () => apiOk(template)
    }
  } as unknown as LocalWorkOsApi;
}
