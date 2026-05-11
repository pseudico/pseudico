import type { ShortcutDescriptor } from "./ShortcutRegistry";

export const APP_SHORTCUT_IDS = {
  openCommandPalette: "navigation.commandPalette.open",
  quickTask: "capture.quickTask",
  quickNote: "capture.quickNote",
  quickList: "capture.quickList",
  focusSearch: "navigation.search.focus",
  goToday: "navigation.today.open",
  save: "editing.save",
  cancel: "editing.cancel",
  listIndent: "lists.indent",
  listOutdent: "lists.outdent",
  listMoveUp: "lists.moveUp",
  listMoveDown: "lists.moveDown"
} as const;

export type AppShortcutId = (typeof APP_SHORTCUT_IDS)[keyof typeof APP_SHORTCUT_IDS];

export const defaultShortcutDescriptors: readonly ShortcutDescriptor[] = [
  {
    id: APP_SHORTCUT_IDS.openCommandPalette,
    title: "Open command palette",
    description: "Search routes and local actions without leaving the keyboard.",
    category: "Navigation",
    scope: "global",
    binding: { key: "k", primary: true, label: "Ctrl/Cmd K" }
  },
  {
    id: APP_SHORTCUT_IDS.quickTask,
    title: "Quick task",
    description: "Open Quick Start on the task form for the current container or Inbox.",
    category: "Capture",
    scope: "global",
    binding: { key: "n", primary: true, label: "Ctrl/Cmd N" }
  },
  {
    id: APP_SHORTCUT_IDS.quickNote,
    title: "New note",
    description: "Open Quick Start on the note form for the current container or Inbox.",
    category: "Capture",
    scope: "global",
    binding: { key: "n", primary: true, shift: true, label: "Ctrl/Cmd Shift N" }
  },
  {
    id: APP_SHORTCUT_IDS.quickList,
    title: "New list",
    description: "Open Quick Start on the list form for the current container or Inbox.",
    category: "Capture",
    scope: "global",
    binding: { key: "l", primary: true, shift: true, label: "Ctrl/Cmd Shift L" }
  },
  {
    id: APP_SHORTCUT_IDS.focusSearch,
    title: "Search workspace",
    description: "Open the local search view.",
    category: "Navigation",
    scope: "global",
    binding: { key: "f", primary: true, label: "Ctrl/Cmd F" }
  },
  {
    id: APP_SHORTCUT_IDS.goToday,
    title: "Go to Today",
    description: "Jump to the Today planning surface.",
    category: "Navigation",
    scope: "global",
    binding: { key: "1", primary: true, label: "Ctrl/Cmd 1" }
  },
  {
    id: APP_SHORTCUT_IDS.save,
    title: "Save editor changes",
    description: "Submit the active editor form when supported.",
    category: "Editing",
    scope: "editor",
    binding: { key: "s", primary: true, label: "Ctrl/Cmd S" },
    allowInEditable: true
  },
  {
    id: APP_SHORTCUT_IDS.cancel,
    title: "Cancel or close",
    description: "Close the current modal or cancel the active editing flow.",
    category: "Editing",
    scope: "modal",
    binding: { key: "Escape", label: "Esc" },
    allowInEditable: true
  },
  {
    id: APP_SHORTCUT_IDS.listIndent,
    title: "Indent list row",
    description: "Move the active checklist row one level deeper.",
    category: "Lists",
    scope: "list-editor",
    binding: { key: "ArrowRight", primary: true, label: "Ctrl/Cmd Right" },
    allowInEditable: true
  },
  {
    id: APP_SHORTCUT_IDS.listOutdent,
    title: "Outdent list row",
    description: "Move the active checklist row one level higher.",
    category: "Lists",
    scope: "list-editor",
    binding: { key: "ArrowLeft", primary: true, label: "Ctrl/Cmd Left" },
    allowInEditable: true
  },
  {
    id: APP_SHORTCUT_IDS.listMoveUp,
    title: "Move list row up",
    description: "Move the active checklist row earlier in the list.",
    category: "Lists",
    scope: "list-editor",
    binding: { key: "ArrowUp", primary: true, label: "Ctrl/Cmd Up" },
    allowInEditable: true
  },
  {
    id: APP_SHORTCUT_IDS.listMoveDown,
    title: "Move list row down",
    description: "Move the active checklist row later in the list.",
    category: "Lists",
    scope: "list-editor",
    binding: { key: "ArrowDown", primary: true, label: "Ctrl/Cmd Down" },
    allowInEditable: true
  }
];



