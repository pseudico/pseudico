import { BookOpen, CheckCircle2, CircleHelp, Keyboard } from "lucide-react";
import { SafeMarkdownPreview } from "../forms/MarkdownEditor";

export type HelpArticleViewModel = {
  id: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  relatedRoutes?: readonly string[];
};

export type HelpNavigationProps = {
  articles: readonly HelpArticleViewModel[];
  selectedArticleId: string;
  onSelectArticle: (articleId: string) => void;
};

export function HelpNavigation({
  articles,
  selectedArticleId,
  onSelectArticle
}: HelpNavigationProps): React.JSX.Element {
  const groupedArticles = groupHelpArticles(articles);

  return (
    <nav className="help-navigation" aria-label="Help center topics">
      {groupedArticles.map((group) => (
        <section key={group.category} aria-label={`${group.category} help`}>
          <p className="help-navigation-category">{group.category}</p>
          {group.articles.map((article) => (
            <button
              aria-current={article.id === selectedArticleId ? "page" : undefined}
              className={
                article.id === selectedArticleId
                  ? "help-navigation-item selected"
                  : "help-navigation-item"
              }
              key={article.id}
              type="button"
              onClick={() => onSelectArticle(article.id)}
            >
              <span>{article.title}</span>
              <small>{article.summary}</small>
            </button>
          ))}
        </section>
      ))}
    </nav>
  );
}

export type HelpArticleViewProps = {
  article: HelpArticleViewModel;
  onOpenRoute?: (route: string) => void;
};

export function HelpArticleView({
  article,
  onOpenRoute
}: HelpArticleViewProps): React.JSX.Element {
  return (
    <article className="help-article-view">
      <div className="help-article-heading">
        <BookOpen size={22} aria-hidden="true" />
        <div>
          <p className="top-eyebrow">{article.category}</p>
          <h2>{article.title}</h2>
          <p>{article.summary}</p>
        </div>
      </div>

      <SafeMarkdownPreview content={article.body} />

      {article.relatedRoutes === undefined || article.relatedRoutes.length === 0 ? null : (
        <div className="help-related-routes" aria-label="Related local views">
          <h3>Related local views</h3>
          <div>
            {article.relatedRoutes.map((route) =>
              onOpenRoute === undefined ? (
                <span key={route}>{route}</span>
              ) : (
                <button key={route} type="button" onClick={() => onOpenRoute(route)}>
                  {route}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export type OnboardingChecklistEntry = {
  id: string;
  title: string;
  description: string;
  helpArticleId: string;
};

export type OnboardingChecklistProps = {
  items: readonly OnboardingChecklistEntry[];
  completedItemIds?: readonly string[];
  onOpenHelp?: (articleId: string) => void;
};

export function OnboardingChecklist({
  completedItemIds = [],
  items,
  onOpenHelp
}: OnboardingChecklistProps): React.JSX.Element {
  const completed = new Set(completedItemIds);

  return (
    <section className="onboarding-checklist" aria-label="Onboarding checklist">
      <div className="onboarding-checklist-heading">
        <CircleHelp size={20} aria-hidden="true" />
        <div>
          <p className="top-eyebrow">Onboarding</p>
          <h3>Start with these local-first basics</h3>
        </div>
      </div>
      <ol>
        {items.map((item) => {
          const isComplete = completed.has(item.id);

          return (
            <li key={item.id} data-complete={isComplete ? "true" : "false"}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              {onOpenHelp === undefined ? null : (
                <button type="button" onClick={() => onOpenHelp(item.helpArticleId)}>
                  Read help
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export type HelpShortcutListProps = {
  shortcuts: readonly { label: string; value: string }[];
};

export function HelpShortcutList({
  shortcuts
}: HelpShortcutListProps): React.JSX.Element {
  return (
    <dl className="help-shortcut-list" aria-label="Keyboard shortcuts">
      {shortcuts.map((shortcut) => (
        <div key={`${shortcut.label}:${shortcut.value}`}>
          <dt>
            <Keyboard size={16} aria-hidden="true" />
            {shortcut.label}
          </dt>
          <dd>
            <kbd>{shortcut.value}</kbd>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function groupHelpArticles(
  articles: readonly HelpArticleViewModel[]
): Array<{ category: string; articles: HelpArticleViewModel[] }> {
  const groups = new Map<string, HelpArticleViewModel[]>();

  for (const article of articles) {
    groups.set(article.category, [...(groups.get(article.category) ?? []), article]);
  }

  return [...groups].map(([category, groupArticles]) => ({
    category,
    articles: groupArticles
  }));
}
