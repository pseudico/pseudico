import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  GroupedResultsList,
  ItemFeed,
  RecentActivityList,
  type GroupedResultViewModel,
  type UniversalItemViewModel
} from "../src";

describe("virtualized feed components", () => {
  it("windows large item feeds instead of rendering every card", () => {
    const items = createItems(250);

    const html = renderToStaticMarkup(
      <ItemFeed
        items={items}
        virtualization={{
          estimatedItemHeight: 100,
          viewportHeight: 300,
          minItems: 20
        }}
      />
    );

    expect(html).toContain('data-virtualized="true"');
    expect(html).toContain("Task 1");
    expect(html).not.toContain("Task 250");
  });

  it("windows large grouped result sets per group", () => {
    const results = createResults(160);

    const html = renderToStaticMarkup(
      <GroupedResultsList
        groups={[{ key: "all", label: "All", results }]}
        virtualization={{
          estimatedItemHeight: 90,
          viewportHeight: 270,
          minItems: 20
        }}
      />
    );

    expect(html).toContain('data-virtualized="true"');
    expect(html).toContain("Result 1");
    expect(html).not.toContain("Result 160");
  });

  it("windows large activity lists", () => {
    const activity = Array.from({ length: 120 }, (_, index) => ({
      id: `activity_${index}`,
      action: "item_created",
      description: `Activity ${index + 1}`,
      createdAt: "2026-04-30T00:00:00.000Z"
    }));

    const html = renderToStaticMarkup(
      <RecentActivityList
        activity={activity}
        virtualization={{
          estimatedItemHeight: 80,
          viewportHeight: 240,
          minItems: 20
        }}
      />
    );

    expect(html).toContain('data-virtualized="true"');
    expect(html).toContain("Activity 1");
    expect(html).not.toContain("Activity 120");
  });
});

function createItems(count: number): UniversalItemViewModel[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item_${index}`,
    type: "task",
    title: `Task ${index + 1}`,
    status: "active"
  }));
}

function createResults(count: number): GroupedResultViewModel[] {
  return Array.from({ length: count }, (_, index) => ({
    targetType: "item",
    targetId: `result_${index}`,
    kind: "task",
    title: `Result ${index + 1}`,
    containerTitle: "Performance Project",
    tags: [],
    destinationPath: `/projects/container_${index}`
  }));
}
