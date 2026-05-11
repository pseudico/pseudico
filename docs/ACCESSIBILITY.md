# Accessibility and keyboard behavior

Local Work OS is designed to remain usable with a keyboard only. The current accessibility baseline covers the workspace shell, navigation, Quick Start, command palette, context menus, confirmation dialogs, and forms.

## Global keyboard shortcuts

- `Ctrl/? K` opens the command palette from anywhere outside text-entry controls.
- `Ctrl/? N` opens Quick Start for a new task when a workspace is open.
- `Ctrl/? Shift N` opens Quick Start for a new note when a workspace is open.
- `Ctrl/? L` opens Quick Start for a new list when a workspace is open.
- `Ctrl/? /` focuses the Search route when a workspace is open.
- `Ctrl/? 1` opens Today when a workspace is open.

Global shortcuts intentionally do not fire while focus is inside inputs, textareas, selects, or editable content.

## Shell and navigation

- A visible-on-focus “Skip to workspace content” link is the first tabbable control in the shell.
- Primary navigation, pinned/favorite navigation, app tabs, navigation history, search, Quick Start, and command controls are reachable by Tab.
- Icon-only or compact icon controls expose text labels or `aria-label` values.

## Command palette

- The command palette is an `aria-modal` dialog labelled by its heading.
- Initial focus goes to the command search input.
- Arrow Up/Down moves the active command, Enter executes it, Escape closes the palette, and Tab/Shift+Tab remain trapped inside the dialog.
- Disabled commands remain visible with a reason and cannot be executed.

## Quick Start and dialogs

- Quick Start and confirmation dialogs are labelled modal dialogs.
- Escape closes an idle dialog; Quick Start ignores Escape while a submission is in progress.
- Tab and Shift+Tab stay inside the active dialog.
- Form validation messages are visible inline and should be read before retrying.

## Context menus

- Context menus can be opened with right click, the Context Menu key, or Shift+F10 from a focused context region/trigger.
- Arrow Up/Down, Home, and End move between enabled menu items.
- Escape closes the menu and restores focus to the trigger or focused region.

## Manual QA checklist

1. Launch the app with a local workspace open.
2. Use Tab from the top of the window and verify the skip link appears, then activates the main workspace region.
3. Press `Ctrl/? K`, type “search”, use Arrow keys, press Enter, and verify the Search route opens.
4. Press `Ctrl/? N`, create a task with only keyboard input, and verify focus remains within Quick Start until it closes.
5. Use the top-bar search form with only keyboard input to search for the task.
6. Open a context menu with Shift+F10, move with Arrow keys, and close it with Escape.


## Keyboard-first checklist editing

Checklist rows support keyboard selection and scoped editing shortcuts. Enter submits the inline add-row field, Escape clears dirty add-row text before clearing row selection, Arrow Up/Down moves row focus, and Ctrl/Cmd+Arrow Left/Right/Up/Down outdents, indents, or reorders the focused row through the list service.
