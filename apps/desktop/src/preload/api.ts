export type ShellStatus = {
  appName: string;
  localOnly: true;
  workspaceConnected: false;
  databaseConnected: false;
};

export type LocalWorkOsApi = {
  app: {
    getShellStatus: () => ShellStatus;
  };
};

export const localWorkOsApi: LocalWorkOsApi = {
  app: {
    getShellStatus: () => ({
      appName: "Local Work OS",
      localOnly: true,
      workspaceConnected: false,
      databaseConnected: false
    })
  }
};
