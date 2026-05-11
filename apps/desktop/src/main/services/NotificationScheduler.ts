import { ReminderService } from "@local-work-os/features";
import {
  ListRepository,
  TaskRepository,
  type DatabaseConnection,
  type ReminderEventRecord
} from "@local-work-os/db";
import { Notification } from "electron";

export type ReminderNotification = {
  title: string;
  body: string;
};

export type ReminderNotifier = (notification: ReminderNotification) => void;

export class NotificationScheduler {
  private readonly connection: DatabaseConnection;
  private readonly notifier: ReminderNotifier;
  private readonly now: () => Date;
  private readonly timersByPolicyId = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(input: {
    connection: DatabaseConnection;
    notifier?: ReminderNotifier;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
    this.notifier = input.notifier ?? showElectronNotification;
  }

  scheduleWorkspace(workspaceId: string): void {
    const service = this.createReminderService();

    for (const event of service.listNextScheduledReminderEvents(workspaceId)) {
      this.scheduleEvent(event);
    }
  }

  scheduleReminder(policyId: string): void {
    this.cancelReminder(policyId);
    const event = this.createReminderService().getNextEventForPolicy(policyId);

    if (event !== null) {
      this.scheduleEvent(event);
    }
  }

  cancelReminder(policyId: string): void {
    const timer = this.timersByPolicyId.get(policyId);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.timersByPolicyId.delete(policyId);
    }
  }

  cancelAll(): void {
    for (const timer of this.timersByPolicyId.values()) {
      clearTimeout(timer);
    }

    this.timersByPolicyId.clear();
  }

  private scheduleEvent(event: ReminderEventRecord): void {
    this.cancelReminder(event.policyId);
    const fireAt = event.status === "snoozed" && event.snoozedUntil !== null
      ? event.snoozedUntil
      : event.scheduledForAt;
    const delay = Math.max(0, new Date(fireAt).getTime() - this.now().getTime());
    const timer = setTimeout(() => {
      void this.fireEvent(event.id);
    }, delay);

    this.timersByPolicyId.set(event.policyId, timer);
  }

  private async fireEvent(eventId: string): Promise<void> {
    const result = await this.createReminderService().markReminderFired(eventId);
    const task = result.event.targetType === "item"
      ? new TaskRepository(this.connection).getByItemId(result.event.targetId)
      : null;
    const listItem = result.event.targetType === "list_item"
      ? new ListRepository(this.connection).getListItemById(result.event.targetId)
      : null;

    if (task !== null) {
      this.notifier({
        title: "Task reminder",
        body: task.item.title
      });
    } else if (listItem !== null) {
      this.notifier({
        title: "List item reminder",
        body: listItem.title
      });
    }

    this.timersByPolicyId.delete(result.event.policyId);
    this.scheduleReminder(result.event.policyId);
  }

  private createReminderService(): ReminderService {
    return new ReminderService({
      connection: this.connection,
      now: this.now
    });
  }
}

function showElectronNotification(notification: ReminderNotification): void {
  if (!Notification.isSupported()) {
    return;
  }

  new Notification(notification).show();
}
