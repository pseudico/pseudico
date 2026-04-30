import type { LocalWorkOsApi } from "../../preload/api";

declare global {
  interface Window {
    localWorkOs: LocalWorkOsApi;
  }
}

export {};
