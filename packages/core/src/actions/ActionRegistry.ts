export type ActionShortcut = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  label?: string;
};

export type ActionDisabledState<TContext> =
  | boolean
  | string
  | ((context: TContext) => boolean | string);

export type ActionDescriptor<TContext = unknown> = {
  id: string;
  title: string;
  group: string;
  subtitle?: string;
  keywords?: readonly string[];
  shortcut?: ActionShortcut;
  disabled?: ActionDisabledState<TContext>;
  execute: (context: TContext) => void | Promise<void>;
};

export type ResolvedAction<TContext = unknown> = ActionDescriptor<TContext> & {
  disabledReason: string | null;
  score: number;
};

export type ActionMatchOptions<TContext> = {
  query?: string;
  context: TContext;
  limit?: number;
};

export class ActionRegistry<TContext = unknown> {
  readonly #actions = new Map<string, ActionDescriptor<TContext>>();

  register(action: ActionDescriptor<TContext>): void {
    const normalizedId = action.id.trim();

    if (normalizedId.length === 0) {
      throw new Error("Action id is required.");
    }

    if (this.#actions.has(normalizedId)) {
      throw new Error(`Action '${normalizedId}' is already registered.`);
    }

    this.#actions.set(normalizedId, {
      ...action,
      id: normalizedId,
      keywords: action.keywords ?? []
    });
  }

  registerMany(actions: readonly ActionDescriptor<TContext>[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  get(id: string): ActionDescriptor<TContext> | null {
    return this.#actions.get(id) ?? null;
  }

  list(context: TContext): ResolvedAction<TContext>[] {
    return [...this.#actions.values()].map((action) =>
      resolveAction(action, context, 0)
    );
  }

  search(options: ActionMatchOptions<TContext>): ResolvedAction<TContext>[] {
    const query = normalizeActionQuery(options.query ?? "");
    const matches = [...this.#actions.values()]
      .map((action) => {
        const score = scoreAction(action, query);

        return score === null
          ? null
          : resolveAction(action, options.context, score);
      })
      .filter((action): action is ResolvedAction<TContext> => action !== null)
      .sort(compareResolvedActions);

    return typeof options.limit === "number"
      ? matches.slice(0, Math.max(0, options.limit))
      : matches;
  }
}

export function createActionRegistry<TContext = unknown>(
  actions: readonly ActionDescriptor<TContext>[] = []
): ActionRegistry<TContext> {
  const registry = new ActionRegistry<TContext>();
  registry.registerMany(actions);
  return registry;
}

export function normalizeActionQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function resolveAction<TContext>(
  action: ActionDescriptor<TContext>,
  context: TContext,
  score: number
): ResolvedAction<TContext> {
  return {
    ...action,
    disabledReason: resolveDisabledReason(action.disabled, context),
    score
  };
}

function resolveDisabledReason<TContext>(
  disabled: ActionDisabledState<TContext> | undefined,
  context: TContext
): string | null {
  const value = typeof disabled === "function" ? disabled(context) : disabled;

  if (value === undefined || value === false) {
    return null;
  }

  return typeof value === "string" ? value : "Unavailable";
}

function scoreAction<TContext>(
  action: ActionDescriptor<TContext>,
  query: string
): number | null {
  if (query.length === 0) {
    return 1;
  }

  const haystacks = [
    { value: action.title, weight: 100 },
    { value: action.group, weight: 70 },
    { value: action.subtitle ?? "", weight: 40 },
    { value: action.id, weight: 25 },
    ...(action.keywords ?? []).map((keyword) => ({
      value: keyword,
      weight: 60
    }))
  ];

  let bestScore: number | null = null;

  for (const haystack of haystacks) {
    const normalized = normalizeActionQuery(haystack.value);

    if (normalized.length === 0) {
      continue;
    }

    const index = normalized.indexOf(query);

    if (index === -1) {
      continue;
    }

    const prefixBonus = index === 0 ? 25 : 0;
    const exactBonus = normalized === query ? 50 : 0;
    const candidateScore = haystack.weight + prefixBonus + exactBonus;
    bestScore =
      bestScore === null ? candidateScore : Math.max(bestScore, candidateScore);
  }

  return bestScore;
}

function compareResolvedActions<TContext>(
  left: ResolvedAction<TContext>,
  right: ResolvedAction<TContext>
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  const groupComparison = left.group.localeCompare(right.group);

  if (groupComparison !== 0) {
    return groupComparison;
  }

  return left.title.localeCompare(right.title);
}
