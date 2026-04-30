import { contextBridge, ipcRenderer } from "electron";
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

contextBridge.exposeInMainWorld("localWorkOs", createLocalWorkOsApi(invoke));
