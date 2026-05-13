# Local Work OS Template File Format

Local Work OS template exports use JSON files with the `.lwo-template`
extension. The format is local-only and portable between workspaces; it does
not require cloud services or remote storage.

## Version 1 envelope

Each file is a JSON object with:

- `fileType: "local-work-os.template"`
- `fileVersion: 1`
- `exportedAt`: ISO timestamp for the file export
- `source`: non-authoritative origin metadata from the exporting workspace
- `metadata`: display name, description, kind, embedded template JSON version,
  and recommended extension
- `capabilities`: boolean flags for tabs, tasks, notes, lists, links, file
  placeholders, tags, categories, relative dates, and contact fields
- `references`: portable tag and category metadata used by the template
- `template`: the existing versioned template JSON payload

The embedded `template.version` is currently `1` and supports list, project,
and contact templates. Project/contact templates can include tabs, tasks,
notes, lists and list rows, links, file placeholders, tag references, category
references, contact fields, and relative day offsets.

## Import validation

`TemplateImportValidator` validates the envelope, file version, embedded
template JSON, capability flags, extension, and portable references. Unknown
future `fileVersion` values are rejected so later migrations can add explicit
upgrade logic rather than silently applying incompatible templates.

Validation does not read or write arbitrary renderer paths. File-based reads
must be provided by an Electron main/preload adapter, and actual template
instantiation continues through existing template services.

## Template pack exports

Template packs use `.lwo-template-pack` JSON files for local-only transfer of
multiple saved templates between workspaces. A v1 pack contains
`fileType: "local-work-os.template-pack"`, pack metadata, aggregate capability
flags, and a `templates` array of normal v1 `.lwo-template` envelopes.

`TemplatePackImportValidator` validates the pack envelope and every embedded
template before import. Successful imports create local template rows and
activity events with `importer` as the actor; binary attachment bytes are not
copied into template packs.

## Versioning policy

- Additive fields may be introduced only when v1 validators can safely ignore
  them.
- Breaking shape changes require a new `fileVersion`.
- Embedded template payload migrations should preserve `metadata.templateJsonVersion`.
- File placeholders preserve attachment metadata but do not copy binary files
  into the template export.
