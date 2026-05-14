# Markdown Folder and Obsidian Vault Import

Status: PSE-194 implementation note
Scope: local folders only; no Obsidian Sync, plugin settings, cloud APIs, or remote attachment fetching.

The Markdown folder importer previews and imports local Markdown folders as a project, top-level folders as tabs, nested folders as headings, Markdown files as notes, and non-Markdown files as local attachments. Obsidian-style vault metadata is enriched during preview/import:

- YAML frontmatter is parsed for simple scalar/list metadata and note `title`/`tags` values.
- Obsidian `#tags` in Markdown bodies and frontmatter tags are normalized to Local Work OS tags.
- Wiki-links are parsed with Obsidian alias/heading syntax normalized for local relationship resolution.
- Obsidian attachment embeds (`![[asset.png]]`) and Markdown image links are resolved only to files inside the selected folder.
- `.canvas` files are reported as unsupported warnings and skipped.

Unsupported or intentionally out-of-scope behavior:

- Obsidian plugin settings/data, Sync metadata, remote URLs, and plugin-specific data models are not imported.
- Attachment embeds that do not resolve to a local file remain warnings; the importer does not fetch remote or missing files.
- Frontmatter parsing is intentionally conservative and supports common scalar/list fields rather than full YAML fidelity.
