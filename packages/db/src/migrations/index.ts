import { initialSchemaSql } from "./0001_initial_schema";
import { contactFieldsSql } from "./0002_contact_fields";
import { remindersSql } from "./0003_reminders";
import { templatesSql } from "./0004_templates";
import { containerTemplatesSql } from "./0005_container_templates";
import { recurrenceSql } from "./0006_recurrence";
import { attachmentVersionsSql } from "./0007_attachment_versions";
import { workflowsSql } from "./0008_workflows";
import { containerMediaSql } from "./0009_container_media";
import { tabVisibilitySql } from "./0010_tab_visibility";
import { reminderTargetsSql } from "./0011_reminder_targets";
import { reviewTaskStatusesSql } from "./0012_review_task_statuses";
import { commentsSql } from "./0013_comments";
import { calendarFeedsSql } from "./0014_calendar_feeds";
import { dashboardWidgetLayoutTypesSql } from "./0015_dashboard_widget_layout_types";
import { dashboardExtraWidgetTypesSql } from "./0016_dashboard_extra_widget_types";
import { workflowItemCreatedTriggerSql } from "./0017_workflow_item_created_trigger";
import { workflowFileImportedTriggerSql } from "./0018_workflow_file_imported_trigger";
import { workflowMetadataTriggersSql } from "./0019_workflow_metadata_triggers";
import { workflowRunRollbackSql } from "./0020_workflow_run_rollback";
import type { MigrationDefinition } from "../services/MigrationService";

export const migrations: MigrationDefinition[] = [
  {
    version: 1,
    name: "initial_schema",
    sql: initialSchemaSql,
    checksum: "pse-16-initial-schema-v1"
  },
  {
    version: 2,
    name: "contact_fields",
    sql: contactFieldsSql,
    checksum: "pse-68-contact-fields-v1"
  },
  {
    version: 3,
    name: "reminders",
    sql: remindersSql,
    checksum: "pse-72-reminders-v1"
  },
  {
    version: 4,
    name: "templates",
    sql: templatesSql,
    checksum: "pse-76-templates-v1"
  },
  {
    version: 5,
    name: "container_templates",
    sql: containerTemplatesSql,
    checksum: "pse-77-container-templates-v1"
  },
  {
    version: 6,
    name: "recurrence",
    sql: recurrenceSql,
    checksum: "pse-78-recurrence-v1"
  },
  {
    version: 7,
    name: "attachment_versions",
    sql: attachmentVersionsSql,
    checksum: "pse-80-attachment-versions-v1"
  },
  {
    version: 8,
    name: "workflows",
    sql: workflowsSql,
    checksum: "pse-81-workflows-v1"
  },
  {
    version: 9,
    name: "container_media",
    sql: containerMediaSql,
    checksum: "pse-102-container-media-v1"
  },
  {
    version: 10,
    name: "tab_visibility",
    sql: tabVisibilitySql,
    checksum: "pse-107-tab-visibility-v1"
  },
  {
    version: 11,
    name: "reminder_targets",
    sql: reminderTargetsSql,
    checksum: "pse-120-reminder-targets-v1"
  },
  {
    version: 12,
    name: "review_task_statuses",
    sql: reviewTaskStatusesSql,
    checksum: "pse-121-review-task-statuses-v1"
  },
  {
    version: 13,
    name: "comments",
    sql: commentsSql,
    checksum: "pse-129-comments-v1"
  },
  {
    version: 14,
    name: "calendar_feeds",
    sql: calendarFeedsSql,
    checksum: "pse-141-calendar-feeds-v1"
  },
  {
    version: 15,
    name: "dashboard_widget_layout_types",
    sql: dashboardWidgetLayoutTypesSql,
    checksum: "pse-144-dashboard-widget-layout-types-v1"
  },
  {
    version: 16,
    name: "dashboard_extra_widget_types",
    sql: dashboardExtraWidgetTypesSql,
    checksum: "pse-153-dashboard-extra-widget-types-v1"
  },
  {
    version: 17,
    name: "workflow_item_created_trigger",
    sql: workflowItemCreatedTriggerSql,
    checksum: "pse-156-workflow-item-created-trigger-v1"
  },
  {
    version: 18,
    name: "workflow_file_imported_trigger",
    sql: workflowFileImportedTriggerSql,
    checksum: "pse-157-workflow-file-imported-trigger-v1"
  },
  {
    version: 19,
    name: "workflow_metadata_triggers",
    sql: workflowMetadataTriggersSql,
    checksum: "pse-158-workflow-metadata-triggers-v1"
  },
  {
    version: 20,
    name: "workflow_run_rollback",
    sql: workflowRunRollbackSql,
    checksum: "pse-164-workflow-run-rollback-v1"
  }
];



