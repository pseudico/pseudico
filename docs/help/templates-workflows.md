# Templates and Workflows

Templates help repeat local project/contact/list patterns without cloud services
or hosted automation.

## Beta workflow status

Workflows are a **small guided beta feature**, not a broad automation engine.
The Workflows page supports predefined household-renovation review workflows:

- Project review.
- Contact follow-up.
- Approval and decision review.

Each workflow asks only for small, nontechnical choices. Project review can be
focused on balcony approvals, painting, electrical, bathroom, budget risk, or
all. Contact follow-up asks for the contact, follow-up type, related project,
and optional due date. Approval and decision review asks for the project and
approval area.

The safe loop is always:

```text
choose template -> fill small form -> preview -> confirm -> run -> review result/history
```

Preview does not change data. Running a workflow creates local tasks/notes and
relationships through the same services used elsewhere in Pseudico, so activity
logs and search records are updated.

## What workflows do not do

- No background execution.
- No user-authored scripts.
- No webhooks, cloud sync, accounts, telemetry, or hosted workflow services.
- No external messages are sent.
- No approvals or decisions are changed automatically.

## Template guidance

- Save reusable project, contact, or list structures as local templates.
- Export template packs only to local files that you control.
- Keep templates generic; do not embed secrets, credentials, or proprietary reference-product assets.
