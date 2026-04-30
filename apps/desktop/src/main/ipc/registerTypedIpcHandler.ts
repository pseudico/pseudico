import { ipcMain, type IpcMainInvokeEvent } from "electron";
import type {
  LocalWorkOsIpcChannel,
  LocalWorkOsIpcInput,
  LocalWorkOsIpcResult
} from "../../preload/api";

type TypedIpcHandler<Channel extends LocalWorkOsIpcChannel> = (
  event: IpcMainInvokeEvent,
  input: LocalWorkOsIpcInput<Channel>
) =>
  | LocalWorkOsIpcResult<Channel>
  | Promise<LocalWorkOsIpcResult<Channel>>;

export function registerTypedIpcHandler<
  Channel extends LocalWorkOsIpcChannel
>(channel: Channel, handler: TypedIpcHandler<Channel>): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, (event, input: LocalWorkOsIpcInput<Channel>) =>
    handler(event, input)
  );
}
