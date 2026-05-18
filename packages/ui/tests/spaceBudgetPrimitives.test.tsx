import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CommandSearchInput,
  MixedFeedItem,
  MultilineCapturePanel,
  ReadableWorkRow,
  SpaceBudgetInspector,
  SpaceBudgetResponsiveFrame,
  TimelineSpaceRow,
  getSpaceBudgetMode,
  longDataFixtures,
  spaceBudgetInspectorFixture,
  spaceBudgetMixedFeedFixtures,
  spaceBudgetReadableRowFixture,
  spaceBudgetTimelineFixture,
  spaceBudgetTokens
} from "../src";

describe("space-budget UI primitives", () => {
  it("renders readable row, command, capture, mixed feed, inspector, and timeline primitives with explicit budget metadata", () => {
    const html = renderToStaticMarkup(
      <SpaceBudgetResponsiveFrame
        mode="full"
        primary={
          <>
            <CommandSearchInput
              defaultValue="restore evidence"
              label="Command / Search"
            />
            <MultilineCapturePanel
              defaultValue={longDataFixtures.notePreview}
              label="Capture"
            />
            <ReadableWorkRow {...spaceBudgetReadableRowFixture} />
            {spaceBudgetMixedFeedFixtures.map((item) => (
              <MixedFeedItem key={`${item.itemType}:${item.title}`} {...item} />
            ))}
            <TimelineSpaceRow {...spaceBudgetTimelineFixture} />
          </>
        }
        inspector={<SpaceBudgetInspector {...spaceBudgetInspectorFixture} />}
        secondary={<p>Secondary rail</p>}
      />
    );

    expect(html).toContain('data-space-budget-surface="command"');
    expect(html).toContain(`data-space-budget-min-width="${spaceBudgetTokens.commandPreferredWidthPx}px"`);
    expect(html).toContain('data-space-budget-surface="capture"');
    expect(html).toContain('data-space-budget-surface="readable-row"');
    expect(html).toContain('data-space-budget-surface="mixed-feed"');
    expect(html).toContain('data-space-budget-surface="inspector"');
    expect(html).toContain('data-space-budget-surface="timeline"');
    expect(html).toContain(longDataFixtures.taskTitle);
    expect(html).toContain(longDataFixtures.notePreview);
    expect(html).toContain(longDataFixtures.filename);
    expect(html).toContain(longDataFixtures.linkTitle);
    expect(html).toContain(longDataFixtures.timelineTitle);
  });

  it("uses responsive frame modes that collapse secondary areas before primary content", () => {
    expect(getSpaceBudgetMode(1440)).toBe("full");
    expect(getSpaceBudgetMode(1280)).toBe("full");
    expect(getSpaceBudgetMode(1000)).toBe("collapse-secondary");
    expect(getSpaceBudgetMode(800)).toBe("drawer");

    const html = renderToStaticMarkup(
      <SpaceBudgetResponsiveFrame
        mode="collapse-secondary"
        primary={<ReadableWorkRow {...spaceBudgetReadableRowFixture} />}
        inspector={<SpaceBudgetInspector {...spaceBudgetInspectorFixture} />}
        secondary={<p>Secondary filters</p>}
      />
    );

    expect(html).toContain('data-space-budget-mode="collapse-secondary"');
    expect(html).toContain("Secondary filters");
    expect(html).toContain(longDataFixtures.taskTitle);
  });
});
