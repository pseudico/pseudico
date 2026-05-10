import type { ItemType } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import {
  ContainerTabRepository,
  type ContainerTabRecord
} from "./ContainerTabRepository";

export type TabSummaryPreviewKind = "open_task" | "recent_content";

export type TabSummaryItemPreviewRecord = {
  itemId: string;
  type: ItemType;
  title: string;
  status: string;
  preview: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  kind: TabSummaryPreviewKind;
};

export type TabSummaryRecord = {
  tab: ContainerTabRecord;
  totalItemCount: number;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  upcomingTaskCount: number;
  noteCount: number;
  fileCount: number;
  linkCount: number;
  listCount: number;
  openTaskPreviews: TabSummaryItemPreviewRecord[];
  recentContentPreviews: TabSummaryItemPreviewRecord[];
};

export type ListTabSummariesInput = {
  containerId: string;
  todayStart: string;
  previewLimit?: number;
};

type CountRow = {
  tab_id: string;
  total_item_count: number;
  open_task_count: number;
  completed_task_count: number;
  overdue_task_count: number;
  upcoming_task_count: number;
  note_count: number;
  file_count: number;
  link_count: number;
  list_count: number;
};

type PreviewRow = {
  tab_id: string;
  item_id: string;
  type: string;
  title: string;
  status: string;
  preview: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PREVIEW_LIMIT = 3;
const MAX_PREVIEW_LIMIT = 10;

export class TabSummaryRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  listByContainer(input: ListTabSummariesInput): TabSummaryRecord[] {
    const tabs = new ContainerTabRepository(this.connection).listByContainer(
      input.containerId
    );

    if (tabs.length === 0) {
      return [];
    }

    const defaultTabId = resolveDefaultTabId(tabs);
    const previewLimit = normalizePreviewLimit(input.previewLimit);
    const countsByTab = new Map(
      this.listCounts({
        containerId: input.containerId,
        defaultTabId,
        todayStart: input.todayStart
      }).map((row) => [row.tab_id, row])
    );
    const taskPreviewsByTab = groupPreviewRows(
      this.listOpenTaskPreviews({
        containerId: input.containerId,
        defaultTabId,
        limit: previewLimit
      }),
      "open_task"
    );
    const recentPreviewsByTab = groupPreviewRows(
      this.listRecentContentPreviews({
        containerId: input.containerId,
        defaultTabId,
        limit: previewLimit
      }),
      "recent_content"
    );

    return tabs.map((tab) => {
      const counts = countsByTab.get(tab.id);

      return {
        tab,
        totalItemCount: counts?.total_item_count ?? 0,
        openTaskCount: counts?.open_task_count ?? 0,
        completedTaskCount: counts?.completed_task_count ?? 0,
        overdueTaskCount: counts?.overdue_task_count ?? 0,
        upcomingTaskCount: counts?.upcoming_task_count ?? 0,
        noteCount: counts?.note_count ?? 0,
        fileCount: counts?.file_count ?? 0,
        linkCount: counts?.link_count ?? 0,
        listCount: counts?.list_count ?? 0,
        openTaskPreviews: taskPreviewsByTab.get(tab.id) ?? [],
        recentContentPreviews: recentPreviewsByTab.get(tab.id) ?? []
      };
    });
  }

  private listCounts(input: {
    containerId: string;
    defaultTabId: string;
    todayStart: string;
  }): CountRow[] {
    return this.connection.sqlite
      .prepare<unknown[], CountRow>(
        `select
           coalesce(i.container_tab_id, ?) as tab_id,
           count(i.id) as total_item_count,
           sum(case
             when i.type = 'task'
              and i.completed_at is null
              and td.completed_at is null
              and td.task_status in ('open', 'waiting') then 1
             else 0
           end) as open_task_count,
           sum(case
             when i.type = 'task'
              and (i.completed_at is not null or td.completed_at is not null or td.task_status = 'done') then 1
             else 0
           end) as completed_task_count,
           sum(case
             when i.type = 'task'
              and i.completed_at is null
              and td.completed_at is null
              and td.task_status in ('open', 'waiting')
              and td.due_at is not null
              and td.due_at < ? then 1
             else 0
           end) as overdue_task_count,
           sum(case
             when i.type = 'task'
              and i.completed_at is null
              and td.completed_at is null
              and td.task_status in ('open', 'waiting')
              and td.due_at is not null
              and td.due_at >= ? then 1
             else 0
           end) as upcoming_task_count,
           sum(case when i.type = 'note' then 1 else 0 end) as note_count,
           sum(case when i.type = 'file' then 1 else 0 end) as file_count,
           sum(case when i.type = 'link' then 1 else 0 end) as link_count,
           sum(case when i.type = 'list' then 1 else 0 end) as list_count
         from items i
         left join task_details td on td.item_id = i.id
         where i.container_id = ?
           and i.archived_at is null
           and i.deleted_at is null
         group by coalesce(i.container_tab_id, ?)`
      )
      .all(
        input.defaultTabId,
        input.todayStart,
        input.todayStart,
        input.containerId,
        input.defaultTabId
      );
  }

  private listOpenTaskPreviews(input: {
    containerId: string;
    defaultTabId: string;
    limit: number;
  }): PreviewRow[] {
    return this.connection.sqlite
      .prepare<unknown[], PreviewRow>(
        `with ranked as (
           select
             coalesce(i.container_tab_id, ?) as tab_id,
             i.id as item_id,
             i.type,
             i.title,
             i.status,
             i.body as preview,
             td.due_at,
             i.created_at,
             i.updated_at,
             row_number() over (
               partition by coalesce(i.container_tab_id, ?)
               order by
                 case when td.due_at is null then 1 else 0 end asc,
                 td.due_at asc,
                 i.pinned desc,
                 i.sort_order asc,
                 i.created_at asc,
                 i.id asc
             ) as preview_rank
           from items i
           inner join task_details td on td.item_id = i.id
           where i.container_id = ?
             and i.type = 'task'
             and i.archived_at is null
             and i.deleted_at is null
             and i.completed_at is null
             and td.completed_at is null
             and td.task_status in ('open', 'waiting')
         )
         select tab_id, item_id, type, title, status, preview, due_at, created_at, updated_at
         from ranked
         where preview_rank <= ?
         order by tab_id asc, preview_rank asc`
      )
      .all(input.defaultTabId, input.defaultTabId, input.containerId, input.limit);
  }

  private listRecentContentPreviews(input: {
    containerId: string;
    defaultTabId: string;
    limit: number;
  }): PreviewRow[] {
    return this.connection.sqlite
      .prepare<unknown[], PreviewRow>(
        `with first_attachment as (
           select item_id, min(original_name) as original_name
           from attachments
           where deleted_at is null
           group by item_id
         ), ranked as (
           select
             coalesce(i.container_tab_id, ?) as tab_id,
             i.id as item_id,
             i.type,
             i.title,
             i.status,
             coalesce(nd.preview, first_attachment.original_name, i.body) as preview,
             null as due_at,
             i.created_at,
             i.updated_at,
             row_number() over (
               partition by coalesce(i.container_tab_id, ?)
               order by i.updated_at desc, i.created_at desc, i.id asc
             ) as preview_rank
           from items i
           left join note_details nd on nd.item_id = i.id
           left join first_attachment on first_attachment.item_id = i.id
           where i.container_id = ?
             and i.type in ('note', 'file', 'link', 'list')
             and i.archived_at is null
             and i.deleted_at is null
         )
         select tab_id, item_id, type, title, status, preview, due_at, created_at, updated_at
         from ranked
         where preview_rank <= ?
         order by tab_id asc, preview_rank asc`
      )
      .all(input.defaultTabId, input.defaultTabId, input.containerId, input.limit);
  }
}

function resolveDefaultTabId(tabs: readonly ContainerTabRecord[]): string {
  const defaultTab = tabs.find((tab) => tab.isDefault);
  return defaultTab?.id ?? tabs[0]!.id;
}

function normalizePreviewLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_PREVIEW_LIMIT;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error("previewLimit must be a positive integer.");
  }

  return Math.min(value, MAX_PREVIEW_LIMIT);
}

function groupPreviewRows(
  rows: PreviewRow[],
  kind: TabSummaryPreviewKind
): Map<string, TabSummaryItemPreviewRecord[]> {
  const groups = new Map<string, TabSummaryItemPreviewRecord[]>();

  for (const row of rows) {
    const current = groups.get(row.tab_id) ?? [];
    current.push({
      itemId: row.item_id,
      type: row.type as ItemType,
      title: row.title,
      status: row.status,
      preview: row.preview,
      dueAt: row.due_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kind
    });
    groups.set(row.tab_id, current);
  }

  return groups;
}
