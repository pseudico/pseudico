import { contextBridge, ipcRenderer, webUtils } from "electron";
import {
  createLocalWorkOsApi,
  type LocalWorkOsIpcChannel,
  type LocalWorkOsIpcInput,
  type LocalWorkOsIpcInvoke,
  type LocalWorkOsIpcResult
} from "./api";

const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
  channel: Channel,
  input: LocalWorkOsIpcInput<Channel>
) =>
  ipcRenderer.invoke(channel, input) as Promise<
    LocalWorkOsIpcResult<Channel>
  >;

const api = createLocalWorkOsApi(invoke);

contextBridge.exposeInMainWorld("localWorkOs", {
  ...api,
  dragDrop: {
    ...api.dragDrop,
    getDroppedFilePaths(files: readonly File[]): string[] {
      return files
        .map((file) => webUtils.getPathForFile(file))
        .filter((path) => path.trim().length > 0);
    }
  }
});
