import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  getHelpArticle,
  getHelpArticlesForRoute,
  helpArticles,
  onboardingChecklist,
  type HelpArticleId
} from "@local-work-os/features/help";
import {
  HelpArticleView,
  HelpNavigation,
  HelpShortcutList,
  OnboardingChecklist
} from "@local-work-os/ui";

const helpShortcuts = [
  { label: "Command palette", value: "Ctrl/Cmd+K" },
  { label: "Markdown save", value: "Ctrl/Cmd+Enter" },
  { label: "Markdown bold", value: "Ctrl/Cmd+B" },
  { label: "Markdown link", value: "Ctrl/Cmd+K" },
  { label: "Markdown code", value: "Ctrl/Cmd+E" }
] as const;

export function HelpPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedArticleId = normalizeArticleId(searchParams.get("article"));
  const selectedArticle = getHelpArticle(selectedArticleId);
  const contextualArticles = useMemo(
    () => getHelpArticlesForRoute(searchParams.get("from") ?? "/workspace"),
    [searchParams]
  );

  function selectArticle(articleId: string): void {
    setSearchParams({ article: normalizeArticleId(articleId) });
  }

  return (
    <section className="help-page" aria-label="Local help center">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Local help</p>
          <h2>Help center and onboarding</h2>
          <p>
            Local Markdown guides, command references, onboarding steps, and sample
            workflows. No network connection or hosted account required.
          </p>
        </div>
        <Link to="/workspace" className="secondary-button">
          Back to workspace
        </Link>
      </div>

      <div className="help-page-grid">
        <aside className="help-page-sidebar">
          <HelpNavigation
            articles={helpArticles}
            selectedArticleId={selectedArticle.id}
            onSelectArticle={selectArticle}
          />

          <OnboardingChecklist
            items={onboardingChecklist}
            onOpenHelp={selectArticle}
          />
        </aside>

        <div className="help-page-content">
          <HelpArticleView
            article={selectedArticle}
            onOpenRoute={(route) => navigate(route)}
          />

          <section className="help-context-panel" aria-label="Contextual help links">
            <div>
              <p className="top-eyebrow">Contextual help</p>
              <h3>Useful from here</h3>
            </div>
            <div className="help-context-list">
              {contextualArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => selectArticle(article.id)}
                >
                  <strong>{article.title}</strong>
                  <small>{article.summary}</small>
                </button>
              ))}
            </div>
          </section>

          <HelpShortcutList shortcuts={helpShortcuts} />
        </div>
      </div>
    </section>
  );
}

function normalizeArticleId(value: string | null): HelpArticleId {
  if (helpArticles.some((article) => article.id === value)) {
    return value as HelpArticleId;
  }

  return "getting-started";
}
