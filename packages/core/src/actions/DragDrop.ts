export const LOCAL_WORK_OS_DRAG_MIME_TYPE =
  "application/vnd.local-work-os.drag-payload+json";

export const DRAG_PAYLOAD_TYPES = [
  "item",
  "list_item",
  "container_tab",
  "external_file"
] as const;

export type DragPayloadType = (typeof DRAG_PAYLOAD_TYPES)[number];

export type ItemDragPayload = {
  type: "item";
  itemId: string;
  containerId?: string;
  containerTabId?: string | null;
};

export type ListItemDragPayload = {
  type: "list_item";
  listId: string;
  listItemId: string;
};

export type ContainerTabDragPayload = {
  type: "container_tab";
  containerId: string;
  tabId: string;
};

export type ExternalFileDragPayload = {
  type: "external_file";
  paths: string[];
};

export type LocalWorkOsDragPayload =
  | ItemDragPayload
  | ListItemDragPayload
  | ContainerTabDragPayload
  | ExternalFileDragPayload;

export function encodeDragPayload(payload: LocalWorkOsDragPayload): string {
  assertDragPayload(payload);

  return JSON.stringify(payload);
}

export function parseDragPayload(value: string): LocalWorkOsDragPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;

    return isDragPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isDragPayload(value: unknown): value is LocalWorkOsDragPayload {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "item":
      return (
        isNonEmptyString(value.itemId) &&
        (value.containerId === undefined ||
          isNonEmptyString(value.containerId)) &&
        (value.containerTabId === undefined ||
          value.containerTabId === null ||
          typeof value.containerTabId === "string")
      );
    case "list_item":
      return isNonEmptyString(value.listId) && isNonEmptyString(value.listItemId);
    case "container_tab":
      return isNonEmptyString(value.containerId) && isNonEmptyString(value.tabId);
    case "external_file":
      return (
        Array.isArray(value.paths) &&
        value.paths.length > 0 &&
        value.paths.every(isNonEmptyString)
      );
    default:
      return false;
  }
}

export function moveIdBeforeTarget(
  ids: readonly string[],
  draggedId: string,
  targetId: string
): string[] {
  validateUniqueIds(ids);
  assertKnownId(ids, draggedId, "draggedId");
  assertKnownId(ids, targetId, "targetId");

  if (draggedId === targetId) {
    return [...ids];
  }

  const withoutDragged = ids.filter((id) => id !== draggedId);
  const targetIndex = withoutDragged.indexOf(targetId);

  if (targetIndex < 0) {
    throw new Error("targetId was not found after removing draggedId.");
  }

  return [
    ...withoutDragged.slice(0, targetIndex),
    draggedId,
    ...withoutDragged.slice(targetIndex)
  ];
}

export function createSequentialSortOrders(
  ids: readonly string[],
  step = 1024
): Array<{ id: string; sortOrder: number }> {
  validateUniqueIds(ids);

  if (!Number.isInteger(step) || step <= 0) {
    throw new Error("step must be a positive integer.");
  }

  return ids.map((id, index) => ({
    id,
    sortOrder: (index + 1) * step
  }));
}

function assertDragPayload(payload: LocalWorkOsDragPayload): void {
  if (!isDragPayload(payload)) {
    throw new Error("Invalid drag payload.");
  }
}

function validateUniqueIds(ids: readonly string[]): void {
  if (ids.length === 0) {
    throw new Error("ids must contain at least one id.");
  }

  const seen = new Set<string>();

  for (const id of ids) {
    if (!isNonEmptyString(id)) {
      throw new Error("ids must contain only non-empty strings.");
    }

    if (seen.has(id)) {
      throw new Error("ids must not contain duplicate ids.");
    }

    seen.add(id);
  }
}

function assertKnownId(
  ids: readonly string[],
  id: string,
  fieldName: string
): void {
  if (!ids.includes(id)) {
    throw new Error(`${fieldName} must be present in ids.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
