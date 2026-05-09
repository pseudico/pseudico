import { describe, expect, it } from "vitest";
import {
  apiOk,
  createLocalWorkOsApi,
  LOCAL_WORK_OS_IPC_CHANNELS,
  type LocalWorkOsIpcChannel,
  type LocalWorkOsIpcInput,
  type LocalWorkOsIpcInvoke,
  type LocalWorkOsIpcResult
} from "../../src/preload/api";

function allChannelValues(): string[] {
  return Object.values(LOCAL_WORK_OS_IPC_CHANNELS).flatMap((group) =>
    Object.values(group)
  );
}

describe("typed preload API", () => {
  it("keeps IPC channels centralized and unique", () => {
    const channels = allChannelValues();

    expect(channels).toHaveLength(143);
    expect(new Set(channels).size).toBe(channels.length);
    expect(channels.every((channel) => channel.startsWith("local-work-os:"))).toBe(
      true
    );
  });

  it("exposes only typed API groups instead of raw IPC primitives", () => {
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      void input;

      return Promise.resolve(
        channel === LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace
          ? apiOk(null)
          : apiOk([])
      ) as Promise<LocalWorkOsIpcResult<Channel>>;
    };

    const api = createLocalWorkOsApi(invoke);

    expect(Object.keys(api)).toEqual([
      "workspace",
      "database",
      "inbox",
      "tasks",
      "reminders",
      "lists",
      "templates",
      "notes",
      "links",
      "projects",
      "contacts",
      "tabs",
      "relationships",
      "categories",
      "metadata",
      "search",
      "collections",
      "today",
      "timeline",
      "calendar",
      "dashboard",
      "activity",
      "containers",
      "items",
      "dragDrop",
      "files",
      "backup",
      "import",
      "export",
      "diagnostics",
      "navigation"
    ]);
    expect("ipcRenderer" in api).toBe(false);
    expect("send" in api).toBe(false);
    expect("invoke" in api).toBe(false);
  });

  it("routes workspace calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.workspace.getCurrentWorkspace();

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
        input: undefined
      }
    ]);
  });

  it("routes workspace validation through its named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.workspace.validateWorkspace({
      rootPath: "C:\\work",
      repair: true
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace,
        input: {
          rootPath: "C:\\work",
          repair: true
        }
      }
    ]);
  });

  it("routes project calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.projects.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });
    await api.projects.archiveProject("container_1");
    await api.projects.getProjectHealth("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject,
        input: {
          workspaceId: "workspace_1",
          name: "Launch Plan"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject,
        input: "container_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.projects.getProjectHealth,
        input: "container_1"
      }
    ]);
  });

  it("routes contact calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.contacts.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen"
    });
    await api.contacts.getContact("container_1");
    await api.contacts.addField({
      contactId: "container_1",
      label: "Email",
      value: "alex@example.com",
      type: "email"
    });
    await api.contacts.updateField({
      fieldId: "contact_field_1",
      value: "alex.revised@example.com"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.contacts.createContact,
        input: {
          workspaceId: "workspace_1",
          name: "Alex Chen"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.contacts.getContact,
        input: "container_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.contacts.addField,
        input: {
          contactId: "container_1",
          label: "Email",
          value: "alex@example.com",
          type: "email"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateField,
        input: {
          fieldId: "contact_field_1",
          value: "alex.revised@example.com"
        }
      }
    ]);
  });

  it("routes relationship calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.relationships.linkContactToProject({
      workspaceId: "workspace_1",
      contactId: "contact_1",
      projectId: "project_1"
    });
    await api.relationships.listContactsForProject("project_1");
    await api.relationships.listProjectsForContact("contact_1");
    await api.relationships.unlinkContactFromProject("relationship_1");

    expect(calls).toEqual([
      {
        channel:
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.linkContactToProject,
        input: {
          workspaceId: "workspace_1",
          contactId: "contact_1",
          projectId: "project_1"
        }
      },
      {
        channel:
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.listContactsForProject,
        input: "project_1"
      },
      {
        channel:
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.listProjectsForContact,
        input: "contact_1"
      },
      {
        channel:
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.unlinkContactFromProject,
        input: "relationship_1"
      }
    ]);
  });

  it("routes Inbox calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.inbox.listItems("workspace_1");
    await api.inbox.moveItemToProject({
      itemId: "item_1",
      projectId: "container_1"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject,
        input: {
          itemId: "item_1",
          projectId: "container_1"
        }
      }
    ]);
  });

  it("routes item lifecycle calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.items.move({
      itemId: "item_1",
      targetContainerId: "container_2"
    });
    await api.items.archive("item_1");
    await api.items.softDelete("item_1");
    await api.items.getActivity("item_1");
    await api.items.openInspector("item_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem,
        input: {
          itemId: "item_1",
          targetContainerId: "container_2"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector,
        input: "item_1"
      }
    ]);
  });

  it("routes drag/drop calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.dragDrop!.reorderItems({
      containerId: "container_1",
      containerTabId: "tab_1",
      itemIds: ["item_2", "item_1"]
    });
    await api.dragDrop!.moveItem({
      itemId: "item_1",
      targetContainerId: "container_2"
    });
    await api.dragDrop!.reorderListItems({
      listId: "list_1",
      listItemIds: ["row_2", "row_1"]
    });
    await api.dragDrop!.reorderTabs({
      containerId: "container_1",
      tabIds: ["tab_2", "tab_1"]
    });
    await api.dragDrop!.attachFilesToContainer({
      containerId: "container_1",
      sourcePaths: ["C:\\source\\Brief.pdf"]
    });
    await api.dragDrop!.attachFilesToItem({
      itemId: "item_1",
      sourcePaths: ["C:\\source\\Sketch.png"]
    });

    expect(api.dragDrop!.getDroppedFilePaths([])).toEqual([]);
    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderItems,
        input: {
          containerId: "container_1",
          containerTabId: "tab_1",
          itemIds: ["item_2", "item_1"]
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.moveItem,
        input: {
          itemId: "item_1",
          targetContainerId: "container_2"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderListItems,
        input: {
          listId: "list_1",
          listItemIds: ["row_2", "row_1"]
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderTabs,
        input: {
          containerId: "container_1",
          tabIds: ["tab_2", "tab_1"]
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToContainer,
        input: {
          containerId: "container_1",
          sourcePaths: ["C:\\source\\Brief.pdf"]
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToItem,
        input: {
          itemId: "item_1",
          sourcePaths: ["C:\\source\\Sketch.png"]
        }
      }
    ]);
  });

  it("routes file attachment calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.files.attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: "container_1",
      sourcePath: "C:\\source\\Brief.pdf",
      description: "Brief"
    });
    await api.files.attachFileToItem({
      itemId: "item_1",
      sourcePath: "C:\\source\\Sketch.png"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToContainer,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          sourcePath: "C:\\source\\Brief.pdf",
          description: "Brief"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToItem,
        input: {
          itemId: "item_1",
          sourcePath: "C:\\source\\Sketch.png"
        }
      }
    ]);
  });

  it("routes backup calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.backup.createManualBackup({ workspaceId: "workspace_1" });
    await api.backup.listBackups({ workspaceId: "workspace_1" });
    await api.backup.validateRestoreSource({
      sourceType: "backup",
      backupRelativePath: "backups/snapshot"
    });
    await api.backup.restoreBackupToNewWorkspace({
      backupRelativePath: "backups/snapshot",
      targetRootPath: "C:\\restored"
    });
    await api.backup.restoreExportToNewWorkspace({
      filePath: "C:\\exports\\workspace.json",
      targetRootPath: "C:\\restored-export"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.backup.createManualBackup,
        input: {
          workspaceId: "workspace_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackups,
        input: {
          workspaceId: "workspace_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.backup.validateRestoreSource,
        input: {
          sourceType: "backup",
          backupRelativePath: "backups/snapshot"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupToNewWorkspace,
        input: {
          backupRelativePath: "backups/snapshot",
          targetRootPath: "C:\\restored"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreExportToNewWorkspace,
        input: {
          filePath: "C:\\exports\\workspace.json",
          targetRootPath: "C:\\restored-export"
        }
      }
    ]);
  });

  it("routes export calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.export.exportWorkspaceJson({ workspaceId: "workspace_1" });
    await api.export.exportProjectMarkdown({ projectId: "container_1" });
    await api.export.exportTasksCsv({ workspaceId: "workspace_1", format: "tsv" });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.export.exportWorkspaceJson,
        input: {
          workspaceId: "workspace_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.export.exportProjectMarkdown,
        input: {
          projectId: "container_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.export.exportTasksCsv,
        input: {
          workspaceId: "workspace_1",
          format: "tsv"
        }
      }
    ]);
  });

  it("routes import validation calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.import.validateWorkspaceExportJson({
      filePath: "C:\\exports\\workspace.json"
    });
    await api.import.chooseAndValidateWorkspaceExportJson();

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.import.validateWorkspaceExportJson,
        input: {
          filePath: "C:\\exports\\workspace.json"
        }
      },
      {
        channel:
          LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndValidateWorkspaceExportJson,
        input: undefined
      }
    ]);
  });

  it("routes task calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.tasks.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      title: "Call supplier"
    });
    await api.tasks.update({
      itemId: "item_1",
      dueAt: "2026-05-04"
    });
    await api.tasks.complete("item_1");
    await api.tasks.reopen("item_1");
    await api.tasks.snooze({
      itemId: "item_1",
      preset: "tomorrow"
    });
    await api.tasks.reschedule({
      itemId: "item_1",
      dueAt: "2026-05-10"
    });
    await api.tasks.listByContainer("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          title: "Call supplier"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask,
        input: {
          itemId: "item_1",
          dueAt: "2026-05-04"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.snoozeTask,
        input: {
          itemId: "item_1",
          preset: "tomorrow"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.rescheduleTask,
        input: {
          itemId: "item_1",
          dueAt: "2026-05-10"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer,
        input: "container_1"
      }
    ]);
  });

  it("routes reminder calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.reminders!.setTaskReminder({
      workspaceId: "workspace_1",
      taskId: "item_1",
      leadMinutes: 30
    });
    await api.reminders!.clearTaskReminder({ taskId: "item_1" });
    await api.reminders!.dismissReminder({ eventId: "reminder_event_1" });
    await api.reminders!.snoozeReminder({
      eventId: "reminder_event_1",
      until: "2026-05-02T11:00:00.000Z"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.reminders.setTaskReminder,
        input: {
          workspaceId: "workspace_1",
          taskId: "item_1",
          leadMinutes: 30
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearTaskReminder,
        input: { taskId: "item_1" }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.reminders.dismissReminder,
        input: { eventId: "reminder_event_1" }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.reminders.snoozeReminder,
        input: {
          eventId: "reminder_event_1",
          until: "2026-05-02T11:00:00.000Z"
        }
      }
    ]);
  });

  it("routes list calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.lists.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      title: "Launch checklist"
    });
    await api.lists.addItem({
      listId: "item_list_1",
      title: "Confirm copy"
    });
    await api.lists.completeItem("list_item_1");
    await api.lists.reopenItem("list_item_1");
    await api.lists.enablePipelineMode("item_list_1");
    await api.lists.disablePipelineMode("item_list_1");
    await api.lists.getPipelineViewModel("item_list_1");
    await api.lists.movePipelineCard({
      listId: "item_list_1",
      cardId: "list_item_card_1",
      targetStageId: "list_item_stage_1"
    });
    await api.lists.bulkAddItems({
      listId: "item_list_1",
      text: "- Confirm copy"
    });
    await api.lists.listByContainer("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.createList,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          title: "Launch checklist"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem,
        input: {
          listId: "item_list_1",
          title: "Confirm copy"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem,
        input: "list_item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem,
        input: "list_item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.enablePipelineMode,
        input: "item_list_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.disablePipelineMode,
        input: "item_list_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.getPipelineViewModel,
        input: "item_list_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.movePipelineCard,
        input: {
          listId: "item_list_1",
          cardId: "list_item_card_1",
          targetStageId: "list_item_stage_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems,
        input: {
          listId: "item_list_1",
          text: "- Confirm copy"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer,
        input: "container_1"
      }
    ]);
  });

  it("routes note calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.notes.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      title: "Launch note",
      content: "# Brief"
    });
    await api.notes.update({
      itemId: "item_note_1",
      content: "Updated note"
    });
    await api.notes.listByContainer("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          title: "Launch note",
          content: "# Brief"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote,
        input: {
          itemId: "item_note_1",
          content: "Updated note"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer,
        input: "container_1"
      }
    ]);
  });

  it("routes link calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.links.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      url: "example.com/brief",
      title: "Launch brief"
    });
    await api.links.update({
      itemId: "item_link_1",
      description: "Updated reference"
    });
    await api.links.listByContainer("container_1");
    await api.links.openExternal("item_link_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.links.createLink,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          url: "example.com/brief",
          title: "Launch brief"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.links.updateLink,
        input: {
          itemId: "item_link_1",
          description: "Updated reference"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.links.listByContainer,
        input: "container_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.links.openExternal,
        input: "item_link_1"
      }
    ]);
  });

  it("routes category calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.categories.createCategory({
      workspaceId: "workspace_1",
      name: "Operations",
      color: "#3b82f6"
    });
    await api.categories.updateCategory({
      categoryId: "category_1",
      name: "Client Work"
    });
    await api.categories.assignToProject({
      projectId: "container_1",
      categoryId: "category_1"
    });
    await api.categories.assignToItem({
      itemId: "item_1",
      categoryId: null
    });
    await api.categories.listCategories("workspace_1");
    await api.categories.deleteCategory("category_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory,
        input: {
          workspaceId: "workspace_1",
          name: "Operations",
          color: "#3b82f6"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory,
        input: {
          categoryId: "category_1",
          name: "Client Work"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject,
        input: {
          projectId: "container_1",
          categoryId: "category_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem,
        input: {
          itemId: "item_1",
          categoryId: null
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory,
        input: "category_1"
      }
    ]);
  });

  it("routes metadata browser calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.metadata.listTagsWithCounts("workspace_1");
    await api.metadata.listCategoriesWithCounts("workspace_1");
    await api.metadata.listTargetsByMetadata({
      workspaceId: "workspace_1",
      tagSlugs: ["finance"],
      categoryId: "category_1"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata,
        input: {
          workspaceId: "workspace_1",
          tagSlugs: ["finance"],
          categoryId: "category_1"
        }
      }
    ]);
  });

  it("routes search calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.search.searchWorkspace({
      workspaceId: "workspace_1",
      query: "launch",
      kinds: ["project", "task"]
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace,
        input: {
          workspaceId: "workspace_1",
          query: "launch",
          kinds: ["project", "task"]
        }
      }
    ]);
  });

  it("routes collection calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.collections.listCollections("workspace_1");
    await api.collections.createTagCollection({
      workspaceId: "workspace_1",
      tagSlug: "finance"
    });
    await api.collections.createKeywordCollection({
      workspaceId: "workspace_1",
      query: "supplier"
    });
    await api.collections.evaluateCollection("saved_view_1");
    await api.collections.createTaskInCollection({
      workspaceId: "workspace_1",
      collectionId: "saved_view_1",
      containerId: "container_1",
      title: "Call accountant"
    });
    await api.collections.listSmartLists("workspace_1");
    await api.collections.createSmartList({
      workspaceId: "workspace_1",
      name: "Waiting tasks",
      criteria: {
        itemTypes: ["task"],
        taskStatuses: ["waiting"]
      }
    });
    await api.collections.updateSmartList({
      smartListId: "saved_view_2",
      name: "Due soon"
    });
    await api.collections.previewSmartList({
      workspaceId: "workspace_1",
      criteria: {
        dueFilter: "next7Days"
      }
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.listCollections,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.createTagCollection,
        input: {
          workspaceId: "workspace_1",
          tagSlug: "finance"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.createKeywordCollection,
        input: {
          workspaceId: "workspace_1",
          query: "supplier"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.evaluateCollection,
        input: "saved_view_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.createTaskInCollection,
        input: {
          workspaceId: "workspace_1",
          collectionId: "saved_view_1",
          containerId: "container_1",
          title: "Call accountant"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.listSmartLists,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.createSmartList,
        input: {
          workspaceId: "workspace_1",
          name: "Waiting tasks",
          criteria: {
            itemTypes: ["task"],
            taskStatuses: ["waiting"]
          }
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.updateSmartList,
        input: {
          smartListId: "saved_view_2",
          name: "Due soon"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.collections.previewSmartList,
        input: {
          workspaceId: "workspace_1",
          criteria: {
            dueFilter: "next7Days"
          }
        }
      }
    ]);
  });

  it("routes activity calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.activity.listRecent({ workspaceId: "workspace_1", limit: 5 });
    await api.activity.listForTarget({
      targetType: "container",
      targetId: "container_1"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity,
        input: { workspaceId: "workspace_1", limit: 5 }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget,
        input: {
          targetType: "container",
          targetId: "container_1"
        }
      }
    ]);
  });

  it("routes Today calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.today.getViewModel({
      workspaceId: "workspace_1",
      date: "2026-05-04",
      backlogDays: 7
    });
    await api.today.getOrCreateDailyPlan({
      workspaceId: "workspace_1",
      date: "2026-05-04"
    });
    await api.today.planTask({
      workspaceId: "workspace_1",
      date: "2026-05-04",
      itemId: "item_1",
      lane: "today"
    });
    await api.today.reorderPlannedTask({
      workspaceId: "workspace_1",
      date: "2026-05-04",
      itemId: "item_1",
      lane: "today",
      sortOrder: 512
    });
    await api.today.getPlannedTasks({
      workspaceId: "workspace_1",
      date: "2026-05-04",
      lane: "today"
    });
    await api.today.unplanTask({
      workspaceId: "workspace_1",
      date: "2026-05-04",
      itemId: "item_1",
      lane: "today"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.today.getViewModel,
        input: {
          workspaceId: "workspace_1",
          date: "2026-05-04",
          backlogDays: 7
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.today.getOrCreateDailyPlan,
        input: {
          workspaceId: "workspace_1",
          date: "2026-05-04"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.today.planTask,
        input: {
          workspaceId: "workspace_1",
          date: "2026-05-04",
          itemId: "item_1",
          lane: "today"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.today.reorderPlannedTask,
        input: {
          workspaceId: "workspace_1",
          date: "2026-05-04",
          itemId: "item_1",
          lane: "today",
          sortOrder: 512
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.today.getPlannedTasks,
        input: {
          workspaceId: "workspace_1",
          date: "2026-05-04",
          lane: "today"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.today.unplanTask,
        input: {
          workspaceId: "workspace_1",
          date: "2026-05-04",
          itemId: "item_1",
          lane: "today"
        }
      }
    ]);
  });

  it("routes dashboard calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.dashboard.getDefault({
      workspaceId: "workspace_1"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.dashboard.getDefault,
        input: {
          workspaceId: "workspace_1"
        }
      }
    ]);
  });

  it("routes timeline calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.timeline!.getViewModel({
      workspaceId: "workspace_1",
      start: "2026-05-01",
      end: "2026-05-15",
      groupBy: "project",
      includeCompleted: true
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.timeline.getViewModel,
        input: {
          workspaceId: "workspace_1",
          start: "2026-05-01",
          end: "2026-05-15",
          groupBy: "project",
          includeCompleted: true
        }
      }
    ]);
  });

  it("routes calendar calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.calendar!.getMonth({
      workspaceId: "workspace_1",
      month: "2026-05",
      includeCompleted: true
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.calendar.getMonth,
        input: {
          workspaceId: "workspace_1",
          month: "2026-05",
          includeCompleted: true
        }
      }
    ]);
  });

  it("routes diagnostics calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.diagnostics.runWorkspaceIntegrityCheck({
      workspaceId: "workspace_1"
    });

    expect(calls).toEqual([
      {
        channel:
          LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runWorkspaceIntegrityCheck,
        input: {
          workspaceId: "workspace_1"
        }
      }
    ]);
  });

  it("routes navigation calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.navigation.listRecentTargets("workspace_1");
    await api.navigation.recordTarget({
      workspaceId: "workspace_1",
      target: {
        targetType: "view",
        targetId: "today",
        path: "/today",
        label: "Today"
      }
    });
    await api.navigation.listPinnedFavorites("workspace_1");
    await api.navigation.listAppTabs("workspace_1");
    await api.navigation.openAppTab({
      workspaceId: "workspace_1",
      target: {
        targetType: "container",
        targetId: "project_1",
        path: "/projects/project_1",
        label: "Project"
      }
    });
    await api.navigation.closeAppTab({ workspaceId: "workspace_1", tabId: "tab_1" });
    await api.navigation.reorderAppTabs({
      workspaceId: "workspace_1",
      tabIds: ["tab_2", "tab_1"]
    });
    await api.navigation.setActiveAppTab({
      workspaceId: "workspace_1",
      tabId: "tab_2"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.listRecentTargets,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.recordTarget,
        input: {
          workspaceId: "workspace_1",
          target: {
            targetType: "view",
            targetId: "today",
            path: "/today",
            label: "Today"
          }
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.listPinnedFavorites,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.listAppTabs,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.openAppTab,
        input: {
          workspaceId: "workspace_1",
          target: {
            targetType: "container",
            targetId: "project_1",
            path: "/projects/project_1",
            label: "Project"
          }
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.closeAppTab,
        input: { workspaceId: "workspace_1", tabId: "tab_1" }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.reorderAppTabs,
        input: {
          workspaceId: "workspace_1",
          tabIds: ["tab_2", "tab_1"]
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.navigation.setActiveAppTab,
        input: {
          workspaceId: "workspace_1",
          tabId: "tab_2"
        }
      }
    ]);
  });
});
