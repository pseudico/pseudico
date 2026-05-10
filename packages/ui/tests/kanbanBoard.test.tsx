import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KanbanBoard, type KanbanColumnViewModel } from "../src";

const columns: KanbanColumnViewModel[] = [
  {
    id: "active",
    title: "Active",
    description: "Moving forward.",
    color: "#245c55",
    cards: [
      {
        id: "project_1",
        title: "Launch Plan",
        description: "Supplier checklist",
        color: "#245c55",
        meta: "active",
        pinned: true
      }
    ]
  },
  {
    id: "waiting",
    title: "Waiting",
    description: "Blocked or paused.",
    cards: []
  }
];

describe("KanbanBoard", () => {
  it("renders columns, counts, cards, open actions, and move controls", () => {
    const html = renderToStaticMarkup(
      <KanbanBoard
        ariaLabel="Project phase board"
        columns={columns}
        onMoveCard={() => undefined}
        onOpenCard={() => undefined}
      />
    );

    expect(html).toContain("Project phase board");
    expect(html).toContain("Active");
    expect(html).toContain("Moving forward.");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Supplier checklist");
    expect(html).toContain("Open project");
    expect(html).toContain("Move Launch Plan to column");
    expect(html).toContain("Waiting");
    expect(html).toContain("No cards in this column.");
  });

  it("renders moving and disabled states", () => {
    const html = renderToStaticMarkup(
      <KanbanBoard
        ariaLabel="Project phase board"
        columns={columns}
        disabled
        movingCardId="project_1"
        onMoveCard={() => undefined}
      />
    );

    expect(html).toContain("data-kanban-card-moving=\"true\"");
    expect(html).toContain("disabled=\"\"");
  });
});
