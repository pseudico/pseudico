export type SelectionTargetType = "item" | "container" | "list_item";

export type SelectionTarget = {
  id: string;
  type: SelectionTargetType;
};

export type SelectionSnapshot = {
  scopeId: string;
  selected: SelectionTarget[];
  selectedIds: string[];
  count: number;
};

export type SelectionChangeListener = (snapshot: SelectionSnapshot) => void;

export class SelectionStore {
  private readonly scopeId: string;
  private readonly selected = new Map<string, SelectionTarget>();
  private readonly listeners = new Set<SelectionChangeListener>();

  constructor(scopeId: string) {
    validateNonEmptyString(scopeId, "scopeId");
    this.scopeId = scopeId;
  }

  getSnapshot(): SelectionSnapshot {
    const selected = [...this.selected.values()];

    return {
      scopeId: this.scopeId,
      selected,
      selectedIds: selected.map((target) => target.id),
      count: selected.length
    };
  }

  isSelected(id: string): boolean {
    validateNonEmptyString(id, "id");
    return this.selected.has(id);
  }

  select(target: SelectionTarget): SelectionSnapshot {
    validateTarget(target);
    this.selected.set(target.id, target);
    return this.emit();
  }

  deselect(id: string): SelectionSnapshot {
    validateNonEmptyString(id, "id");
    this.selected.delete(id);
    return this.emit();
  }

  toggle(target: SelectionTarget): SelectionSnapshot {
    validateTarget(target);

    if (this.selected.has(target.id)) {
      this.selected.delete(target.id);
    } else {
      this.selected.set(target.id, target);
    }

    return this.emit();
  }

  selectMany(targets: readonly SelectionTarget[]): SelectionSnapshot {
    for (const target of targets) {
      validateTarget(target);
      this.selected.set(target.id, target);
    }

    return this.emit();
  }

  replace(targets: readonly SelectionTarget[]): SelectionSnapshot {
    this.selected.clear();

    for (const target of targets) {
      validateTarget(target);
      this.selected.set(target.id, target);
    }

    return this.emit();
  }

  clear(): SelectionSnapshot {
    if (this.selected.size === 0) {
      return this.getSnapshot();
    }

    this.selected.clear();
    return this.emit();
  }

  subscribe(listener: SelectionChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): SelectionSnapshot {
    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }

    return snapshot;
  }
}

function validateTarget(target: SelectionTarget): void {
  validateNonEmptyString(target.id, "target.id");

  if (!["item", "container", "list_item"].includes(target.type)) {
    throw new Error("target.type must be item, container, or list_item.");
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
