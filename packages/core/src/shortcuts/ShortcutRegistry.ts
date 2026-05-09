export type ShortcutModifier = "ctrl" | "meta" | "shift" | "alt";

export type ShortcutScope =
  | "global"
  | "workspace"
  | "modal"
  | "editor"
  | "list-editor";

export type ShortcutCategory =
  | "Navigation"
  | "Capture"
  | "Editing"
  | "Lists";

export type ShortcutBinding = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  primary?: boolean;
  shift?: boolean;
  alt?: boolean;
  label?: string;
};

export type ShortcutDescriptor = {
  id: string;
  title: string;
  description: string;
  category: ShortcutCategory;
  scope: ShortcutScope;
  binding: ShortcutBinding;
  allowInEditable?: boolean;
};

export type RegisteredShortcut = ShortcutDescriptor & {
  normalizedKey: string;
  displayLabel: string;
};

export type ShortcutEventTargetKind = "editable" | "plain";

export type ShortcutMatchContext = {
  scope?: ShortcutScope;
  targetKind?: ShortcutEventTargetKind;
};

export type ShortcutKeyboardEventLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  target?: unknown;
};

export class ShortcutRegistry {
  readonly #shortcuts = new Map<string, RegisteredShortcut>();

  register(shortcut: ShortcutDescriptor): void {
    const normalizedId = shortcut.id.trim();

    if (normalizedId.length === 0) {
      throw new Error("Shortcut id is required.");
    }

    if (this.#shortcuts.has(normalizedId)) {
      throw new Error(`Shortcut '${normalizedId}' is already registered.`);
    }

    this.#shortcuts.set(normalizedId, normalizeShortcutDescriptor({
      ...shortcut,
      id: normalizedId
    }));
  }

  registerMany(shortcuts: readonly ShortcutDescriptor[]): void {
    for (const shortcut of shortcuts) {
      this.register(shortcut);
    }
  }

  get(id: string): RegisteredShortcut | null {
    return this.#shortcuts.get(id) ?? null;
  }

  list(options: { scope?: ShortcutScope } = {}): RegisteredShortcut[] {
    const shortcuts = [...this.#shortcuts.values()];

    if (options.scope === undefined) {
      return shortcuts.sort(compareShortcuts);
    }

    return shortcuts
      .filter((shortcut) => shortcut.scope === options.scope)
      .sort(compareShortcuts);
  }

  match(
    event: ShortcutKeyboardEventLike,
    context: ShortcutMatchContext = {}
  ): RegisteredShortcut | null {
    const targetKind = context.targetKind ?? getShortcutEventTargetKind(event.target);

    for (const shortcut of this.#shortcuts.values()) {
      if (context.scope !== undefined && shortcut.scope !== context.scope) {
        continue;
      }

      if (
        targetKind === "editable" &&
        !shortcut.allowInEditable &&
        shortcut.scope !== "editor" &&
        shortcut.scope !== "list-editor"
      ) {
        continue;
      }

      if (matchesShortcutBinding(event, shortcut.binding)) {
        return shortcut;
      }
    }

    return null;
  }
}

export function createShortcutRegistry(
  shortcuts: readonly ShortcutDescriptor[] = []
): ShortcutRegistry {
  const registry = new ShortcutRegistry();
  registry.registerMany(shortcuts);
  return registry;
}

export function matchesShortcutBinding(
  event: ShortcutKeyboardEventLike,
  binding: ShortcutBinding
): boolean {
  return (
    normalizeShortcutKey(event.key) === normalizeShortcutKey(binding.key) &&
    matchesPrimaryModifier(event, binding) &&
    Boolean(event.shiftKey) === Boolean(binding.shift) &&
    Boolean(event.altKey) === Boolean(binding.alt)
  );
}

export function normalizeShortcutKey(key: string): string {
  const normalized = key.trim().toLocaleLowerCase();

  if (normalized === " ") {
    return "space";
  }

  if (normalized === "esc") {
    return "escape";
  }

  if (normalized === "arrowleft") {
    return "left";
  }

  if (normalized === "arrowright") {
    return "right";
  }

  if (normalized === "arrowup") {
    return "up";
  }

  if (normalized === "arrowdown") {
    return "down";
  }

  return normalized;
}

export function formatShortcutBinding(binding: ShortcutBinding): string {
  if (binding.label !== undefined) {
    return binding.label;
  }

  const parts: string[] = [];

  if (binding.primary) {
    parts.push("Ctrl/Cmd");
  } else {
    if (binding.ctrl) {
      parts.push("Ctrl");
    }

    if (binding.meta) {
      parts.push("Cmd");
    }
  }

  if (binding.alt) {
    parts.push("Alt");
  }

  if (binding.shift) {
    parts.push("Shift");
  }

  parts.push(formatShortcutKey(binding.key));

  return parts.join("+");
}

export function getShortcutEventTargetKind(target: unknown): ShortcutEventTargetKind {
  if (!isElementLike(target)) {
    return "plain";
  }

  if (target.isContentEditable === true) {
    return "editable";
  }

  const tagName = typeof target.tagName === "string"
    ? target.tagName.toLocaleLowerCase()
    : "";

  return tagName === "input" || tagName === "textarea" || tagName === "select"
    ? "editable"
    : "plain";
}

function normalizeShortcutDescriptor(
  shortcut: ShortcutDescriptor
): RegisteredShortcut {
  return {
    ...shortcut,
    normalizedKey: normalizeShortcutKey(shortcut.binding.key),
    displayLabel: formatShortcutBinding(shortcut.binding)
  };
}

function compareShortcuts(
  left: RegisteredShortcut,
  right: RegisteredShortcut
): number {
  const categoryComparison = left.category.localeCompare(right.category);

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  const scopeComparison = left.scope.localeCompare(right.scope);

  if (scopeComparison !== 0) {
    return scopeComparison;
  }

  return left.title.localeCompare(right.title);
}

function matchesPrimaryModifier(
  event: ShortcutKeyboardEventLike,
  binding: ShortcutBinding
): boolean {
  if (binding.primary) {
    return Boolean(event.ctrlKey) || Boolean(event.metaKey);
  }

  return (
    Boolean(event.ctrlKey) === Boolean(binding.ctrl) &&
    Boolean(event.metaKey) === Boolean(binding.meta)
  );
}

function formatShortcutKey(key: string): string {
  const normalized = normalizeShortcutKey(key);

  if (normalized.length === 1) {
    return normalized.toLocaleUpperCase();
  }

  const labels: Record<string, string> = {
    escape: "Esc",
    enter: "Enter",
    tab: "Tab",
    left: "Left",
    right: "Right",
    up: "Up",
    down: "Down",
    space: "Space"
  };

  return labels[normalized] ?? normalized;
}

type ElementLike = {
  tagName?: unknown;
  isContentEditable?: unknown;
};

function isElementLike(value: unknown): value is ElementLike {
  return typeof value === "object" && value !== null;
}

