import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getItemTypeLabel,
  ItemActionsMenu,
  ItemFeed,
  ListCardContent,
  MoveToContainerDialog,
  NoteCardContent,
  NoteEditor,
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
});
