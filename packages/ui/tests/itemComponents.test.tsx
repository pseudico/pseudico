import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getItemTypeLabel,
  CategoryBadge,
  CategoryPicker,
  CommentThread,
  BulkSelectionToolbar,
  ConfirmDialog,
  ContextMenu,
  DashboardWidget,
  DateRangeInput,
  EmptyState,
  ErrorState,
  FavoriteProjectsWidget,
  FileCardContent,
  FileMetadataEditor,
  FilePreviewCard,
  FileVersionPanel,
  formatUserError,
  ItemActionsMenu,
  ItemFeed,
  ItemInspectorPanel,
  LinkCardContent,
  LinkEditor,
  LocationCardContent,
  LocationEditor,
  RelatedItemsPanel,
  ListCardContent,
  MetadataFilterPanel,
  MoveItemDialog,
  MoveToContainerDialog,
  NoteCardContent,
  NoteEditor,
  PipelineView,
  ProjectHealthCard,
  ProjectHealthWidget,
  RecentActivityList,
  RecentActivityWidget,
  RecurrencePicker,
  ReminderPicker,
  renderLoadableState,
  SmartListEditor,
  TaskCardContent,
  TodayWidget,
  TodayLane,
  TodayTaskCard,
  ToastViewport,
  UniversalItemCard,
  WebWidget,
  groupContextActions,
  type UniversalItemViewModel
} from "../src";

const taskItem: UniversalItemViewModel = {
  id: "item_1",
  type: "task",
  title: "Call accountant",
  body: "Ask for the revised statement.",
  status: "active",
  categoryLabel: "Finance",
  categoryColor: "#2c6b8f",
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
    expect(html).toContain("--item-accent-color:#2c6b8f");
  });

  it("renders comment threads with add, edit, and delete affordances", () => {
    const html = renderToStaticMarkup(
      <CommentThread
        comments={[
          {
            id: "comment_1",
            body: "Confirm local-only wording.",
            authorLabel: "Al",
            createdAt: "2026-05-02T00:00:00.000Z",
            editedAt: "2026-05-02T00:05:00.000Z"
          }
        ]}
        onAddComment={() => undefined}
        onDeleteComment={() => undefined}
        onUpdateComment={() => undefined}
      />
    );

    expect(html).toContain("Comments");
    expect(html).toContain("1 local annotation");
    expect(html).toContain("Confirm local-only wording.");
    expect(html).toContain("Add comment");
    expect(html).toContain("Edit");
    expect(html).toContain("Delete");
    expect(html).toContain("(edited)");
  });

  it("renders one date-range input for task/list date edits", () => {
    const html = renderToStaticMarkup(
      <DateRangeInput
        allDay={false}
        dueAt={new Date(2026, 4, 3, 17, 0, 0, 0).toISOString()}
        startAt={new Date(2026, 4, 1, 9, 0, 0, 0).toISOString()}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("Date");
    expect(html).toContain("09:00");
    expect(html).toContain("17:00");
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

  it("renders link widgets as disabled until the network gate is enabled", () => {
    const disabledHtml = renderToStaticMarkup(
      <LinkCardContent
        item={{
          id: "item_link_1",
          type: "link",
          title: "Supplier portal",
          url: "https://example.com/portal",
          normalizedUrl: "https://example.com/portal",
          renderAsWidget: true,
          widgetHeight: 240,
          widgetWarningAcceptedAt: "2026-05-02T00:00:00.000Z"
        }}
        onOpen={() => undefined}
        onSave={() => true}
        onUpdateWidgetSettings={() => undefined}
      />
    );

    expect(disabledHtml).toContain("Web widgets are disabled");
    expect(disabledHtml).toContain("Show as card");
    expect(disabledHtml).not.toContain("<iframe");

    const enabledHtml = renderToStaticMarkup(
      <LinkCardContent
        item={{
          id: "item_link_1",
          type: "link",
          title: "Supplier portal",
          url: "https://example.com/portal",
          normalizedUrl: "https://example.com/portal",
          renderAsWidget: true,
          widgetHeight: 240,
          widgetWarningAcceptedAt: "2026-05-02T00:00:00.000Z"
        }}
        webWidgetsEnabled={true}
        onOpen={() => undefined}
        onSave={() => true}
        onUpdateWidgetSettings={() => undefined}
      />
    );

    expect(enabledHtml).toContain("<iframe");
    expect(enabledHtml).toContain("sandbox=\"allow-scripts allow-popups allow-popups-to-escape-sandbox\"");
    expect(enabledHtml).toContain("height=\"240\"");
  });

  it("blocks unsafe web widget URLs in component state", () => {
    const html = renderToStaticMarkup(
      <WebWidget
        networkEnabled={true}
        title="Local admin"
        url="file:///C:/Users/Alice/secret.txt"
      />
    );

    expect(html).toContain("Web widgets can only load HTTP or HTTPS URLs");
    expect(html).not.toContain("<iframe");
  });

  it("renders task status, priority, and editable visual state controls", () => {
    const html = renderToStaticMarkup(
      <TaskCardContent
        item={{
          ...taskItem,
          taskStatus: "waiting",
          priority: 1,
          dueAt: "2026-05-05T00:00:00.000Z"
        }}
        onPriorityChange={() => undefined}
        onStatusChange={() => undefined}
      />
    );

    expect(html).toContain("Task details");
    expect(html).toContain("Waiting");
    expect(html).toContain("P1");
    expect(html).toContain("Priority");
    expect(html).toContain("Status");
    expect(html).toContain("value=\"waiting\"");
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

  it("renders the smart-list criteria editor", () => {
    const html = renderToStaticMarkup(
      <SmartListEditor
        categoryOptions={[
          {
            id: "category_1",
            label: "Finance",
            value: "category_1",
            count: 2
          }
        ]}
        previewCount={3}
        tagOptions={[
          {
            id: "tag_1",
            label: "@Finance",
            value: "finance",
            count: 4
          }
        ]}
        validationMessage="Query is valid."
        onPreview={() => undefined}
        onSave={() => undefined}
      />
    );

    expect(html).toContain("Advanced criteria");
    expect(html).toContain("Item type");
    expect(html).toContain("Container type");
    expect(html).toContain("Task status");
    expect(html).toContain("Task priority");
    expect(html).toContain("Due relative filter");
    expect(html).toContain("Save smart list");
    expect(html).toContain("Preview found 3 results.");
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
    expect(
      renderToStaticMarkup(
        <ItemFeed
          items={[taskItem]}
          selectedItemIds={["item_1"]}
          onSelectionChange={() => undefined}
        />
      )
    ).toContain("checked=\"\"");
  });

  it("renders the bulk selection toolbar with disabled actions", () => {
    const html = renderToStaticMarkup(
      <BulkSelectionToolbar
        disabledActions={["delete"]}
        selectedCount={3}
        onAction={() => undefined}
        onClear={() => undefined}
      />
    );

    expect(html).toContain("3 selected");
    expect(html).toContain("Move");
    expect(html).toContain("Complete");
    expect(html).toContain("Export");
    expect(html).toContain("disabled=\"\"");
  });

  it("renders shared empty, error, loadable, and toast states", () => {
    const emptyHtml = renderToStaticMarkup(
      <EmptyState
        description="Open a workspace before using this view."
        title="No workspace open"
      />
    );
    const errorHtml = renderToStaticMarkup(
      <ErrorState
        error={{ code: "WORKSPACE_ERROR", message: "Manifest missing." }}
      />
    );
    const loadingHtml = renderToStaticMarkup(
      <>{renderLoadableState({ loading: true, loadingLabel: "Checking..." })}</>
    );
    const toastHtml = renderToStaticMarkup(
      <ToastViewport
        toasts={[
          {
            id: "toast_1",
            message: "Backup created.",
            title: "Backup complete",
            tone: "success"
          }
        ]}
      />
    );

    expect(emptyHtml).toContain("No workspace open");
    expect(errorHtml).toContain("Workspace problem: Manifest missing.");
    expect(loadingHtml).toContain("Checking...");
    expect(toastHtml).toContain("Backup complete");
    expect(formatUserError({ code: "IPC_ERROR", message: "Bridge down." })).toBe(
      "Local app bridge error: Bridge down."
    );
  });

  it("renders all item action menu commands", () => {
    const html = renderToStaticMarkup(
      <ItemActionsMenu itemId="item_1" itemTitle="Call accountant" />
    );

    expect(html).toContain("Open");
    expect(html).toContain("Edit");
    expect(html).toContain("Move");
    expect(html).toContain("Tags");
    expect(html).toContain("Category");
    expect(html).toContain("Pin or favorite");
    expect(html).toContain("Archive");
    expect(html).toContain("Duplicate");
    expect(html).toContain("Copy local link");
    expect(html).toContain("Delete");
    expect(html).toContain("Inspect");
  });

  it("renders the shared context menu with grouped disabled actions", () => {
    const actions = [
      {
        id: "open" as const,
        title: "Open",
        group: "Open",
        disabledReason: null,
        danger: false
      },
      {
        id: "delete" as const,
        title: "Delete",
        group: "Danger",
        disabledReason: "Unavailable for this target.",
        danger: true
      }
    ];
    const html = renderToStaticMarkup(
      <ContextMenu
        actions={actions}
        label="Context menu for Call accountant"
        target={{ id: "item_1", type: "item", label: "Call accountant" }}
      >
        <article>Call accountant</article>
      </ContextMenu>
    );

    expect(groupContextActions(actions).map((group) => group.group)).toEqual([
      "Open",
      "Danger"
    ]);
    expect(html).toContain("Context menu for Call accountant");
    expect(html).toContain("Open");
    expect(html).toContain("Delete");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("data-context-target-type=\"item\"");
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

  it("renders universal inspector target switching and edit sections", () => {
    const html = renderToStaticMarkup(
      <ItemInspectorPanel
        activity={[]}
        availableTargets={[
          {
            id: "container_project_1",
            type: "container",
            kind: "project",
            title: "Launch Plan"
          },
          {
            id: "item_1",
            type: "item",
            kind: "task",
            title: "Call accountant"
          }
        ]}
        categories={[
          {
            id: "category_1",
            name: "Finance",
            color: "#2c6b8f"
          }
        ]}
        target={{
          id: "item_1",
          type: "item",
          kind: "task",
          title: "Call accountant",
          categoryId: "category_1",
          categoryLabel: "Finance",
          dueAt: "2026-05-09T00:00:00.000Z",
          startAt: "2026-05-08T00:00:00.000Z",
          tags: [
            {
              id: "tag_1",
              name: "Finance",
              slug: "finance",
              source: "manual"
            }
          ]
        }}
        open
        onAddTag={() => undefined}
        onCategoryChange={() => undefined}
        onClose={() => undefined}
        onDateChange={() => undefined}
        onRemoveTag={() => undefined}
        onTargetChange={() => undefined}
      />
    );

    expect(html).toContain("Inspect object");
    expect(html).toContain("Container: Launch Plan");
    expect(html).toContain("Item: Call accountant");
    expect(html).toContain("Dates");
    expect(html).toContain("Tags");
    expect(html).toContain("Category");
    expect(html).toContain("Relationships");
    expect(html).toContain("Attachments");
    expect(html).toContain("Comments");
    expect(html).toContain("value=\"2026-05-09\"");
    expect(html).toContain("@Finance");
    expect(html).toContain("Add tag");
    expect(html).toContain("Change category");
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
    expect(cardHtml).toContain("Later today");
    expect(cardHtml).toContain("Next week");
    expect(cardHtml).toContain("Custom due date");
    expect(cardHtml).toContain("Remove due");
    expect(cardHtml).toContain("Open source");
    expect(laneHtml).toContain("Today");
    expect(laneHtml).toContain("Tasks due today.");
    expect(laneHtml).toContain("Call accountant");
  });

  it("renders reminder picker presets and clear action", () => {
    const html = renderToStaticMarkup(
      <ReminderPicker
        value={{ mode: "relative", leadMinutes: 60 }}
        onClearReminder={() => undefined}
        onSetReminder={() => undefined}
      />
    );

    expect(html).toContain("Reminder");
    expect(html).toContain("Notifications");
    expect(html).toContain("Before due date");
    expect(html).toContain("Local notifications on");
    expect(html).toContain("1 hour before");
    expect(html).toContain("Clear");
    expect(html).toContain("data-reminder-mode=\"relative\"");
    expect(html).toContain("data-reminder-anchor=\"due\"");
  });

  it("renders recurrence picker frequency and weekday controls", () => {
    const html = renderToStaticMarkup(
      <RecurrencePicker
        value={{ frequency: "weekly", interval: 2, weekdays: [1, 3] }}
        onClearRecurrence={() => undefined}
        onSetRecurrence={() => undefined}
      />
    );

    expect(html).toContain("Repeat");
    expect(html).toContain("Weekly");
    expect(html).toContain("week(s)");
    expect(html).toContain("Mon");
    expect(html).toContain("Wed");
    expect(html).toContain("Clear repeat");
    expect(html).toContain("data-recurrence-frequency=\"weekly\"");
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
            upcomingTaskCount: 1,
            waitingTaskCount: 0,
            completionRatio: 0.4,
            staleAfterDays: 14,
            lastActivityAt: "2026-05-04T00:00:00.000Z",
            isStale: false,
            hasRecentActivity: true,
            totalTaskCount: 5,
            nextDueTask: {
              itemId: "item_1",
              title: "Book launch venue",
              dueAt: "2026-05-04T00:00:00.000Z",
              taskStatus: "open",
              priority: 2
            },
            nextTask: {
              itemId: "item_1",
              title: "Book launch venue",
              dueAt: "2026-05-04T00:00:00.000Z",
              taskStatus: "open",
              priority: 2
            },
            healthBadges: [{ kind: "overdue", label: "1 overdue", tone: "risk" }],
            recentActivity: []
          }
        ]}
      />
    );

    expect(emptyHtml).toContain("Nothing to show");
    expect(todayHtml).toContain("Call accountant");
    expect(todayHtml).toContain("P2");
    expect(todayHtml).toContain("Later today");
    expect(todayHtml).toContain("Remove due");
    expect(projectsHtml).toContain("Pinned &amp; Favorites");
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
          upcomingTaskCount: 1,
          waitingTaskCount: 0,
          completionRatio: 0.4,
          staleAfterDays: 14,
          lastActivityAt: "2026-05-04T00:00:00.000Z",
          isStale: false,
          hasRecentActivity: true,
          totalTaskCount: 5,
          nextDueTask: {
            itemId: "item_1",
            title: "Book launch venue",
            dueAt: "2026-05-04T00:00:00.000Z",
            taskStatus: "open",
            priority: 2
          },
          nextTask: {
            itemId: "item_1",
            title: "Book launch venue",
            dueAt: "2026-05-04T00:00:00.000Z",
            taskStatus: "open",
            priority: 2
          },
          healthBadges: [{ kind: "overdue", label: "1 overdue", tone: "risk" }],
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
        onBulkActionListItems={() => undefined}
        onToggleItem={() => undefined}
      />
    );

    expect(html).toContain("1 of 2 complete");
    expect(html).toContain("Confirm launch copy");
    expect(html).toContain("Send update");
    expect(html).toContain("Ctrl/Cmd+Left");
    expect(html).toContain("aria-selected");
    expect(html).toContain("Bulk paste");
    expect(html).toContain("Add pasted");
    expect(html).toContain("Select Send update");
  });

  it("renders pipeline content with stages, cards, and mode controls", () => {
    const item = {
      id: "item_list_1",
      type: "list" as const,
      title: "Publishing pipeline",
      displayMode: "pipeline",
      listItems: [
        {
          id: "list_item_stage_1",
          title: "Idea",
          status: "open",
          depth: 0,
          listItemParentId: null
        },
        {
          id: "list_item_card_1",
          title: "Draft article",
          status: "open",
          depth: 1,
          listItemParentId: "list_item_stage_1"
        }
      ]
    };
    const cardHtml = renderToStaticMarkup(
      <ListCardContent
        item={item}
        onAddItem={() => undefined}
        onAddPipelineCard={() => undefined}
        onMovePipelineCard={() => undefined}
        onToggleDisplayMode={() => undefined}
      />
    );
    const viewHtml = renderToStaticMarkup(
      <PipelineView item={item} onAddStage={() => undefined} />
    );

    expect(cardHtml).toContain("Switch to checklist");
    expect(cardHtml).toContain("Pipeline mode");
    expect(cardHtml).toContain("Idea");
    expect(cardHtml).toContain("Draft article");
    expect(viewHtml).toContain("Top-level checklist rows are stages");
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

  it("renders resolved, broken, and ambiguous wikilinks in Markdown note previews", () => {
    const html = renderToStaticMarkup(
      <NoteCardContent
        item={{
          id: "item_note_1",
          type: "note",
          title: "Launch note",
          content: "Discuss [[Client A]], [[Missing]], and [[Shared]].",
          wikilinks: [
            {
              title: "Client A",
              status: "resolved",
              target: {
                type: "container",
                id: "container_contact_1",
                kind: "contact",
                title: "Client A"
              }
            },
            { title: "Missing", status: "broken", target: null },
            {
              title: "Shared",
              status: "ambiguous",
              target: null,
              candidates: []
            }
          ]
        }}
        onWikilinkOpen={() => undefined}
      />
    );

    expect(html).toContain("note-wikilink-resolved");
    expect(html).toContain("Open contact: Client A");
    expect(html).toContain("note-wikilink-broken");
    expect(html).toContain("Broken wikilink: Missing");
    expect(html).toContain("note-wikilink-ambiguous");
    expect(html).toContain("Ambiguous wikilink: Shared");
  });

  it("renders safe external links with open, copy, and save actions", () => {
    const html = renderToStaticMarkup(
      <NoteCardContent
        item={{
          id: "item_note_1",
          type: "note",
          title: "Launch note",
          content: "Read [Docs](https://docs.example.com/start) and https://example.com/brief."
        }}
        onExternalLinkCopy={() => undefined}
        onExternalLinkCreate={() => undefined}
        onExternalLinkOpen={() => undefined}
      />
    );

    expect(html).toContain("note-external-link");
    expect(html).toContain("Open external link: https://docs.example.com/start");
    expect(html).toContain("Open external link: https://example.com/brief");
    expect(html).toContain("Copy link");
    expect(html).toContain("Save as link");
    expect(html).not.toContain("https://docs.example.com/start)");
  });

  it("does not render unsafe javascript URLs as external links", () => {
    const html = renderToStaticMarkup(
      <NoteCardContent
        item={{
          id: "item_note_1",
          type: "note",
          title: "Launch note",
          content: "Do not open [bad](javascript:alert(1))."
        }}
        onExternalLinkOpen={() => undefined}
      />
    );

    expect(html).not.toContain("note-external-link");
    expect(html).toContain("javascript:alert(1)");
  });

  it("renders the Markdown note editor with save and cancel controls", () => {
    const html = renderToStaticMarkup(
      <NoteEditor
        contextLabel="Launch Plan"
        initialValues={{
          title: "Launch note",
          content: "# Decision\n[[Cli"
        }}
        wikilinkSuggestions={[{ id: "container_contact_1", title: "Client A", kind: "contact" }]}
        onCancel={() => undefined}
        onSubmit={() => true}
      />
    );

    expect(html).toContain("Note title");
    expect(html).toContain("Markdown");
    expect(html).toContain("Launch note");
    expect(html).toContain("# Decision");
    expect(html).toContain("Wikilink suggestions");
    expect(html).toContain("Client A");
    expect(html).toContain("contact");
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
        checksum: "abc123",
        storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
        description: "Launch brief"
      },
      missing: true,
      preview: {
        kind: "pdf" as const,
        iconLabel: "PDF",
        extension: "pdf",
        sizeLabel: "2.0 KB",
        updatedAt: "2026-05-01T00:00:00.000Z",
        missing: true,
        checksumShort: "abc123",
        versionCount: 1,
        latestVersionNumber: 1,
        thumbnailStoragePath: null,
        thumbnailExists: false,
        previewDataUrl: null
      },
      versions: [
        {
          id: "version_1",
          versionNumber: 1,
          originalName: "Brief.pdf",
          sizeBytes: 2048,
          checksum: "abc123def456",
          storagePath:
            "attachments/2026/05/attachment_1/versions/v1/Brief.pdf",
          note: "Review copy",
          createdAt: "2026-05-01T00:00:00.000Z"
        }
      ]
    };
    const cardHtml = renderToStaticMarkup(
      <FileCardContent
        item={fileItem}
        onCreateSnapshot={() => true}
        onOpen={() => undefined}
        onOpenVersion={() => undefined}
        onReveal={() => undefined}
        onRestoreVersion={() => undefined}
        onSave={() => true}
      />
    );
    const panelHtml = renderToStaticMarkup(
      <FileVersionPanel
        versions={fileItem.versions}
        onCreateSnapshot={() => true}
        onOpenVersion={() => undefined}
        onRestoreVersion={() => undefined}
      />
    );
    const previewHtml = renderToStaticMarkup(
      <FilePreviewCard name="Brief.pdf" preview={fileItem.preview} />
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
    expect(cardHtml).toContain("Preview for Brief.pdf");
    expect(cardHtml).toContain("PDF .PDF");
    expect(cardHtml).toContain("Missing from workspace storage");
    expect(cardHtml).toContain("Versions (1)");
    expect(cardHtml).toContain("Snapshot note");
    expect(cardHtml).toContain("Checksum");
    expect(cardHtml).toContain("abc123def456");
    expect(cardHtml).toContain("Note:");
    expect(cardHtml).toContain("Review copy");
    expect(cardHtml).toContain("Restore");
    expect(panelHtml).toContain("File version history");
    expect(previewHtml).toContain("Versions");
    expect(previewHtml).toContain("1 snapshot");
    expect(editorHtml).toContain("File title");
    expect(editorHtml).toContain("Description");
    expect(editorHtml).toContain("Save file");
  });

  it("renders link cards and the link editor", () => {
    const linkItem = {
      id: "item_link_1",
      type: "link" as const,
      title: "Launch brief",
      url: "example.com/brief",
      normalizedUrl: "https://example.com/brief",
      description: "Supplier reference",
      domain: "example.com",
      faviconPath: "https://example.com/favicon.ico",
      previewImagePath: "https://example.com/images/card.png"
    };
    const cardHtml = renderToStaticMarkup(
      <LinkCardContent
        item={linkItem}
        onFetchMetadata={() => undefined}
        onOpen={() => undefined}
        onSave={() => true}
      />
    );
    const editorHtml = renderToStaticMarkup(
      <LinkEditor
        initialValues={{
          url: "https://example.com/brief",
          title: "Launch brief",
          description: "Supplier reference"
        }}
        onCancel={() => undefined}
        onSubmit={() => true}
      />
    );

    expect(cardHtml).toContain("Supplier reference");
    expect(cardHtml).toContain("example.com");
    expect(cardHtml).toContain("Preview image");
    expect(cardHtml).toContain("https://example.com/favicon.ico");
    expect(cardHtml).toContain("https://example.com/images/card.png");
    expect(cardHtml).toContain("https://example.com/brief");
    expect(cardHtml).toContain("Fetch metadata");
    expect(cardHtml).toContain("Open");
    expect(cardHtml).toContain("Edit");
    expect(editorHtml).toContain("URL");
    expect(editorHtml).toContain("Title");
    expect(editorHtml).toContain("Save link");
  });

  it("renders location cards and the location editor", () => {
    const locationItem = {
      id: "item_location_1",
      type: "location" as const,
      title: "Sydney Opera House",
      address: "Bennelong Point, Sydney NSW",
      latitude: -33.8568,
      longitude: 151.2153,
      viewportCenterLat: -33.8568,
      viewportCenterLng: 151.2153,
      viewportZoom: 15
    };
    const cardHtml = renderToStaticMarkup(
      <LocationCardContent
        item={locationItem}
        onOpen={() => undefined}
        onSave={() => true}
      />
    );
    const editorHtml = renderToStaticMarkup(
      <LocationEditor
        initialValues={{
          title: "Sydney Opera House",
          address: "Bennelong Point, Sydney NSW",
          latitude: "-33.8568",
          longitude: "151.2153",
          viewportZoom: "15"
        }}
        onCancel={() => undefined}
        onSubmit={() => true}
      />
    );

    expect(cardHtml).toContain("Local map placeholder");
    expect(cardHtml).toContain("Bennelong Point");
    expect(cardHtml).toContain("-33.8568, 151.2153");
    expect(cardHtml).toContain("Open map");
    expect(cardHtml).toContain("Edit");
    expect(editorHtml).toContain("Address or place");
    expect(editorHtml).toContain("Saved map viewport");
    expect(editorHtml).toContain("Save location");
  });

});
