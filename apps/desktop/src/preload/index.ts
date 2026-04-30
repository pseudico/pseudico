import { contextBridge } from "electron";
import { localWorkOsApi } from "./api";

contextBridge.exposeInMainWorld("localWorkOs", localWorkOsApi);
