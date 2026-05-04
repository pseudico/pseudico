import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getItemTypeLabel,
  CategoryBadge,
  CategoryPicker,
  ConfirmDialog,
  DashboardWidget,
  FavoriteProjectsWidget,
  FileCardContent,
  FileMetadataEditor,
  ItemActionsMenu,
  ItemFeed,
  ItemInspectorPanel,
  RelatedItemsPanel,
  ListCardContent,
  MetadataFilterPanel,
  MoveItemDialog,
  MoveToContainerDialog,
  NoteCardContent,
  NoteEditor,
  ProjectHealthCard,
  ProjectHealthWidget,
  RecentActivityList,
  RecentActivityWidget,
  TodayWidget,
  TodayLane,
  TodayTaskCard,
  UniversalItemCard,
  type UniversalItemViewModel
} from "../src";

const taskItem: UniversalItemViewModel = {
  id: "item_1",
  type: "task",
  title: "Call accountant",
  body: "Ask for the revised statement.",
  status: "active",
  categoryLabel: "Finance",
  dueLabel: "Today"
};

describe("Universal item UI", () => {
  it("renders item type labels and metadata", () => {
    const html = renderToStaticMarkup(<UniversalItemCard item={taskItem} />);

    expect(html).toContain("Task");
    expect(html).toContain("Call accountant");
    expect(html).toContain("Ask for the revised statement.");
    expect(html).toContain("Finance");
    expect(html).toContain("Today");
  });

  it("renders tag badges on item cards", () => {
    const html = renderToStaticMarkup(
      <UniversalItemCard
        item={{
          ...taskItem,
          tags: [
            {
              id: "tag_1",
              name: "Ops",
              slug: "ops",
              source: "inline"
            },
            {
              id: "tag_2",
              name: "Manual",
              slug: "manual",
              source: "manual"
            }
          ]
        }}
      />
    );

    expect(html).toContain("@Ops");
    expect(html).toContain("@Manual");
    expect(html).toContain("data-tag-source=\"inline\"");
    expect(html).toContain("data-tag-source=\"manual\"");
  });

  it("renders category badge and picker controls", () => {
    const category = {
      id: "category_1",
      name: "Finance",
      color: "#2c6b8f"
    };
    const badgeHtml = renderToStaticMarkup(
      <CategoryBadge category={category} />
    );
    const pickerHtml = renderToStaticMarkup(
      <CategoryPicker
        categories={[category]}
        value="category_1"
        onChange={() => undefined}
      />
    );

    expect(badgeHtml).toContain("Finance");
    expect(badgeHtml).toContain("#2c6b8f");
    expect(pickerHtml).toContain("Category");
    expect(pickerHtml).toContain("No category");
    expect(pickerHtml).toContain("Finance");
  });

  it("renders metadata filter controls with counts", () => {
    const html = renderToStaticMarkup(
      <MetadataFilterPanel
        categories={[
          {
            id: "category_1",
            name: "Finance",
            color: "#2c6b8f",
            targetCount: 2
          }
        ]}
        selectedCategoryId="category_1"
        selectedTagSlugs={["finance"]}
        tags={[
          {
            id: "tag_1",
            name: "Finance",
            slug: "finance",
            targetCount: 3
          }
        ]}
        onClear={() => undefined}
        onSelectCategory={() => undefined}
        onToggleTag={() => undefined}
      />
    );

    expect(html).toContain("Filters");
    expect(html).toContain("@Finance");
    expect(html).toContain("3");
    expect(html).toContain("Any category");
    expect(html).toContain("Finance");
    expect(html).toContain("2");
  });

  it("renders a safe placeholder for unknown item types", () => {
    const html = renderToStaticMarkup(
      <UniversalItemCard
        item={{
          id: "item_unknown",
          type: "spreadsheet",
          title: "Imported row"
        }}
      />
    );

    expect(getItemTypeLabel("spreadsheet")).toBe("Unknown item");
    expect(html).toContain("Unknown item");
    expect(html).toContain("This item can stay in the feed");
  });

  it("renders loading, error, empty, and populated feed states", () => {
    expect(
      renderToStaticMarkup(<ItemFeed items={[]} loading />)
    ).toContain("Loading items");
    expect(
      renderToStaticMarkup(<ItemFeed error="Unable to load items." items={[]} />)
    ).toContain("Unable to load items.");
    expect(renderToStaticMarkup(<ItemFeed items={[]} />)).toContain(
      "No items yet"
    );
    expect(renderToStaticMarkup(<ItemFeed items={[taskItem]} />)).toContain(
      "Call accountant"
    );
  });

  it("renders all item action menu commands", () => {
    const html = renderToStaticMarkup(
      <ItemActionsMenu itemId="item_1" itemTitle="Call accountant" />
    );

    expect(html).toContain("Edit");
    expect(html).toContain("Move");
    expect(html).toContain("Archive");
    expect(html).toContain("Delete");
    expect(html).toContain("Inspect");
  });

  it("renders the move-to-container dialog with project options", () => {
    const html = renderToStaticMarkup(
      <MoveToContainerDialog
        containers={[
          {
            id: "container_project_1",
            name: "Launch Plan"
          }
        ]}
        itemTitle="Call accountant"
        open
        onCancel={() => undefined}
        onMove={() => undefined}
      />
    );

    expect(html).toContain("Call accountant");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Move");
  });

  it("renders the move item alias dialog with project options", () => {
    const html = renderToStaticMarkup(
      <MoveItemDialog
        containers={[{ id: "container_project_1", name: "Launch Plan" }]}
        itemTitle="Call accountant"
        open
        onCancel={() => undefined}
        onMove={() => undefined}
      />
    );

    expect(html).toContain("Call accountant");
    expect(html).toContain("Launch Plan");
  });

  it("renders item confirmations and inspector activity", () => {
    const confirmHtml = renderToStaticMarkup(
      <ConfirmDialog
        confirmLabel="Delete"
        description="The item will be soft-deleted."
        open
        title="Delete Call accountant?"
        tone="danger"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );
    const inspectorHtml = renderToStaticMarkup(
      <ItemInspectorPanel
        activity={[
          {
            id: "activity_1",
            action: "item_moved",
            actorType: "local_user",
            summary: "Moved task.",
            createdAt: "2026-05-01T00:00:00.000Z"
          }
        ]}
        relationships={[
          {
            id: "relationship_1",
            direction: "outgoing",
            relationType: "references",
            sourceType: "item",
            sourceId: "item_1",
            targetType: "container",
            targetId: "container_project_1",
            label: "Project context"
          }
        ]}
        item={{
          id: "item_1",
          type: "task",
          title: "Call accountant",
          status: "active",
          containerId: "container_inbox",
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z"
        }}
        open
        onClose={() => undefined}
      />
    );

    expect(confirmHtml).toContain("Delete Call accountant?");
    expect(confirmHtml).toContain("The item will be soft-deleted.");
    expect(inspectorHtml).toContain("Call accountant");
    expect(inspectorHtml).toContain("Recent activity");
    expect(inspectorHtml).toContain("Related items");
    expect(inspectorHtml).toContain("References: Project context");
    expect(inspectorHtml).toContain("To container container_project_1");
    expect(inspectorHtml).toContain("Item Moved");
    expect(inspectorHtml).toContain("Moved task.");
  });

  it("renders recent activity rows with formatted labels", () => {
    const html = renderToStaticMarkup(
      <RecentActivityList
        activity={[
          {
            id: "activity_1",
            action: "container_updated",
            actionLabel: "Container Updated",
            description: "Updated project.",
            targetLabel: "Container container_1",
            createdAt: "2026-05-01T00:00:00.000Z"
          }
        ]}
      />
    );

    expect(html).toContain("Recent activity");
    expect(html).toContain("Container Updated");
    expect(html).toContain("Updated project.");
    expect(html).toContain("Container container_1");
  });

  it("renders Today lanes and task completion controls", () => {
    const task = {
      itemId: "item_1",
      title: "Call accountant",
      body: "Ask for the revised statement.",
      taskStatus: "open",
      itemStatus: "active",
      dueAt: "2026-05-04T00:00:00.000Z",
      priority: 2,
      containerId: "container_project_1",
      sourceLabel: "Open source"
    };
    const cardHtml = renderToStaticMarkup(
      <TodayTaskCard task={task} onOpenSource={() => undefined} />
    );
    const laneHtml = renderToStaticMarkup(
      <TodayLane
        description="Tasks due today."
        kind="today"
        tasks={[task]}
        title="Today"
        onToggleComplete={() => undefined}
      />
    );

    expect(cardHtml).toContain("Call accountant");
    expect(cardHtml).toContain("Ask for the revised statement.");
    expect(cardHtml).toContain("Complete");
    expect(cardHtml).toContain("Next week");
    expect(cardHtml).toContain("Custom due date");
    expect(cardHtml).toContain("Open source");
    expect(laneHtml).toContain("Today");
    expect(laneHtml).toContain("Tasks due today.");
    expect(laneHtml).toContain("Call accountant");
  });

  it("renders dashboard widget states and rows", () => {
    const emptyHtml = renderToStaticMarkup(
      <DashboardWidget kind="today" title="Today" />
    );
    const todayHtml = renderToStaticMarkup(
      <TodayWidget
        tasks={[
          {
            itemId: "item_1",
            title: "Call accountant",
            containerId: "container_project_1",
            dueAt: "2026-05-04T00:00:00.000Z",
            taskStatus: "open",
            priority: 2
          }
        ]}
      />
    );
    const projectsHtml = renderToStaticMarkup(
      <FavoriteProjectsWidget
        projects={[
          {
            projectId: "container_project_1",
            name: "Launch Plan",
            status: "active",
            color: "#245c55"
          }
        ]}
      />
    );
    const activityHtml = renderToStaticMarkup(
      <RecentActivityWidget
        activity={[
          {
            activityId: "activity_1",
            action: "container_created",
            description: "Created project.",
            createdAt: "2026-05-04T00:00:00.000Z",
            targetType: "container",
            targetId: "container_project_1"
          }
        ]}
      />
    );
    const projectHealthHtml = renderToStaticMarkup(
      <ProjectHealthWidget
        projects={[
          {
            projectId: "container_project_1",
            name: "Launch Plan",
            status: "active",
            color: "#245c55",
            openTaskCount: 3,
            completedTaskCount: 2,
            overdueTaskCount: 1,
            totalTaskCount: 5,
            nextDueTask: {
              itemId: "item_1",
              title: "Book launch venue",
              dueAt: "2026-05-04T00:00:00.000Z",
              taskStatus: "open",
              priority: 2
            },
            recentActivity: []
          }
        ]}
      />
    );

    expect(emptyHtml).toContain("Nothing to show");
    expect(todayHtml).toContain("Call accountant");
    expect(todayHtml).toContain("P2");
    expect(projectsHtml).toContain("Favorite Projects");
    expect(projectsHtml).toContain("Launch Plan");
    expect(activityHtml).toContain("Container Created");
    expect(activityHtml).toContain("Created project.");
    expect(projectHealthHtml).toContain("Project Health");
    expect(projectHealthHtml).toContain("Launch Plan");
    expect(projectHealthHtml).toContain("1 overdue");
  });

  it("renders project health cards with counts, next due, and recent activity", () => {
    const html = renderToStaticMarkup(
      <ProjectHealthCard
        health={{
          projectId: "container_project_1",
          name: "Launch Plan",
          status: "active",
          color: "#245c55",
          openTaskCount: 3,
          completedTaskCount: 2,
          overdueTaskCount: 1,
          totalTaskCount: 5,
          nextDueTask: {
            itemId: "item_1",
            title: "Book launch venue",
            dueAt: "2026-05-04T00:00:00.000Z",
            taskStatus: "open",
            priority: 2
          },
          recentActivity: [
            {
              id: "activity_1",
              action: "task_created",
              actionLabel: "Task Created",
              description: "Created task.",
              createdAt: "2026-05-04T00:00:00.000Z"
            }
          ]
        }}
      />
    );

    expect(html).toContain("Project health");
    expect(html).toContain("Open");
    expect(html).toContain("Completed");
    expect(html).toContain("Overdue");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Task Created");
  });

  it("renders a related items placeholder and populated relationships", () => {
    expect(
      renderToStaticMarkup(<RelatedItemsPanel relationships={[]} />)
    ).toContain("No relationships recorded yet.");

    const html = renderToStaticMarkup(
      <RelatedItemsPanel
        relationships={[
          {
            id: "relationship_1",
            direction: "incoming",
            relationType: "depends_on",
            sourceType: "list_item",
            sourceId: "list_item_1",
            targetType: "item",
            targetId: "item_1"
          }
        ]}
      />
    );

    expect(html).toContain("Depends On");
    expect(html).toContain("From list_item list_item_1");
  });

  it("renders checklist content with progress and bulk paste controls", () => {
    const html = renderToStaticMarkup(
      <ListCardContent
        item={{
          id: "item_list_1",
          type: "list",
          title: "Launch checklist",
          listItems: [
            {
              id: "list_item_1",
              title: "Confirm launch copy",
              status: "done",
              depth: 0
            },
            {
              id: "list_item_2",
              title: "Send update",
              status: "open",
              depth: 1
            }
          ]
        }}
        onAddItem={() => undefined}
        onBulkAddItems={() => undefined}
        onToggleItem={() => undefined}
      />
    );

    expect(html).toContain("1 of 2 complete");
    expect(html).toContain("Confirm launch copy");
    expect(html).toContain("Send update");
    expect(html).toContain("Bulk paste");
    expect(html).toContain("Add pasted");
  });

  it("renders Markdown note previews without raw HTML injection", () => {
    const html = renderToStaticMarkup(
      <NoteCardContent
        item={{
          id: "item_note_1",
          type: "note",
          title: "Launch note",
          content: "# Decision\n\n- Confirm **brief**\n\n<script>alert(1)</script>",
          preview: "Decision Confirm brief"
        }}
        onSave={() => true}
      />
    );

    expect(html).toContain("Decision Confirm brief");
    expect(html).toContain("Confirm brief");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Edit note");
  });

  it("renders the Markdown note editor with save and cancel controls", () => {
    const html = renderToStaticMarkup(
      <NoteEditor
        contextLabel="Launch Plan"
        initialValues={{
          title: "Launch note",
          content: "# Decision"
        }}
        onCancel={() => undefined}
        onSubmit={() => true}
      />
    );

    expect(html).toContain("Note title");
    expect(html).toContain("Markdown");
    expect(html).toContain("Launch note");
    expect(html).toContain("# Decision");
    expect(html).toContain("Save note");
    expect(html).toContain("Cancel");
  });

  it("renders file cards with missing state and metadata editing", () => {
    const fileItem = {
      id: "item_file_1",
      type: "file" as const,
      title: "Brief.pdf",
      attachment: {
        id: "attachment_1",
        originalName: "Brief.pdf",
        storedName: "Brief.pdf",
        sizeBytes: 2048,
        storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
        description: "Launch brief"
      },
      missing: true
    };
    const cardHtml = renderToStaticMarkup(
      <FileCardContent
        item={fileItem}
        onOpen={() => undefined}
        onReveal={() => undefined}
        onSave={() => true}
      />
    );
    const editorHtml = renderToStaticMarkup(
      <FileMetadataEditor
        initialValues={{
          title: "Brief.pdf",
          description: "Launch brief"
        }}
        onCancel={() => undefined}
        onSubmit={() => true}
      />
    );

    expect(cardHtml).toContain("File missing from workspace storage.");
    expect(cardHtml).toContain("Launch brief");
    expect(cardHtml).toContain("2.0 KB");
    expect(cardHtml).toContain("Open");
    expect(cardHtml).toContain("Reveal");
    expect(cardHtml).toContain("Edit");
    expect(editorHtml).toContain("File title");
    expect(editorHtml).toContain("Description");
    expect(editorHtml).toContain("Save file");
  });
});
