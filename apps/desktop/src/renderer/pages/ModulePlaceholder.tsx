type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  summary: string;
  highlights: string[];
};

export function ModulePlaceholder({
  eyebrow,
  title,
  summary,
  highlights
}: ModulePlaceholderProps): React.JSX.Element {
  return (
    <section className="page-grid">
      <div className="page-heading">
        <p className="top-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>

      <div className="placeholder-panel" aria-label={`${title} placeholder`}>
        <div className="placeholder-header">
          <span className="status-dot" aria-hidden="true" />
          <span>Waiting for workspace data</span>
        </div>
        <div className="placeholder-list">
          {highlights.map((highlight) => (
            <div key={highlight} className="placeholder-row">
              <span aria-hidden="true" />
              <p>{highlight}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
