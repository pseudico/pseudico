import {
  CommandSearchInput,
  MixedFeedItem,
  MultilineCapturePanel,
  ReadableWorkRow,
  SpaceBudgetInspector,
  SpaceBudgetResponsiveFrame,
  TimelineSpaceRow,
  longDataFixtures,
  spaceBudgetInspectorFixture,
  spaceBudgetMixedFeedFixtures,
  spaceBudgetReadableRowFixture,
  spaceBudgetTimelineFixture
} from "@local-work-os/ui";

export function SpaceBudgetPrimitiveDemoPage(): React.JSX.Element {
  return (
    <section className="space-budget-demo-page">
      <div className="page-heading">
        <p className="top-eyebrow">SBUX route fixture</p>
        <h2>Space-budget primitives with long local work data</h2>
        <p>
          Production renderer fixture for PSE-231. It proves reusable primitives
          keep primary task, note, filename, link, inspector, and timeline text
          readable before route-specific redesign work starts.
        </p>
      </div>

      <CommandSearchInput
        defaultValue="backup restore evidence attachment manifest next safe action"
        description="Minimum 420px; preferred 640px. Chrome should collapse before this command surface becomes tiny."
        label="Command / Search"
      />

      <MultilineCapturePanel
        defaultValue={`${longDataFixtures.taskTitle}\nSave to: ${longDataFixtures.projectName}\nAttach evidence: ${longDataFixtures.filename}`}
        label="Multiline capture"
        parseFeedback={
          <span>
            Parsed destination: {longDataFixtures.projectName}; due hint:
            Thursday review.
          </span>
        }
        actions={
          <>
            <button className="primary-button" type="button">
              Capture locally
            </button>
            <button className="secondary-button" type="button">
              Clear
            </button>
          </>
        }
      />

      <SpaceBudgetResponsiveFrame
        mode="collapse-secondary"
        primary={
          <div className="space-budget-demo-feed">
            <ReadableWorkRow {...spaceBudgetReadableRowFixture} />
            {spaceBudgetMixedFeedFixtures.map((item) => (
              <MixedFeedItem key={`${item.itemType}:${item.title}`} {...item} />
            ))}
            <TimelineSpaceRow {...spaceBudgetTimelineFixture} />
          </div>
        }
        inspector={<SpaceBudgetInspector {...spaceBudgetInspectorFixture} />}
        secondary={
          <div className="space-budget-demo-secondary">
            <h3>Fallback rules</h3>
            <ul>
              <li>Collapse this secondary rail before primary feed text.</li>
              <li>Use drawers for inspector content below the split-view budget.</li>
              <li>Keep timeline titles in row labels, not narrow bars.</li>
            </ul>
          </div>
        }
      />
    </section>
  );
}
