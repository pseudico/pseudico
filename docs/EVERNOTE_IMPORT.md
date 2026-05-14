# Evernote Import

Status: PSE-193 service foundation

The Evernote importer is local-only and accepts user-provided ENEX and HTML
notebook export files plus already-copied local resource files. It does not use
Evernote accounts, APIs, cloud sync, or remote attachment fetching.

## Supported preview/import scope

- ENEX notes with title, tags, created/updated timestamps, note content, and
  resource metadata.
- HTML note exports with title/meta timestamps, keyword tags, note body, and
  local resource links.
- Copied local resource files attached back to the imported note when matched
  by resource hash, file name, or note-relative path.
- Source-report warnings for unsupported rich formatting, local HTML resource
  links, missing copied resources, unmatched resource files, and unsupported
  export files.

## Import behavior

Execution creates one local project for the imported notebook, imports each
Evernote note as a Markdown note, applies Evernote tags through the tag service,
and attaches matched resources through the existing file attachment service.
Original Evernote created/updated timestamps are preserved in preview rows and
in the imported note body/source metadata rather than rewriting local audit
timestamps.

## Out of scope

- Evernote account login, API access, or network fetching.
- Exact rich-text rendering parity with ENML/HTML.
- Decoding ENEX base64 resources directly in the renderer; native file copying
  must provide local `copiedFile` records before execution.
