import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type CaptureBridgeMode = "native_messaging" | "localhost";

export type CaptureBridgeConfig = {
  enabled?: boolean;
  mode?: CaptureBridgeMode;
  host?: string;
  port?: number;
  token?: string | null;
};

export type CaptureBridgeStatus = {
  enabled: boolean;
  running: boolean;
  mode: CaptureBridgeMode;
  host: string;
  port: number;
  reason: string | null;
};

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 0;

export class CaptureBridge {
  private readonly enabled: boolean;
  private readonly mode: CaptureBridgeMode;
  private readonly host: string;
  private readonly port: number;
  private readonly token: string | null;
  private server: Server | null = null;

  constructor(config: CaptureBridgeConfig = {}) {
    this.enabled = config.enabled ?? false;
    this.mode = config.mode ?? "native_messaging";
    this.host = config.host ?? DEFAULT_HOST;
    this.port = config.port ?? DEFAULT_PORT;
    this.token = config.token ?? null;
  }

  getStatus(): CaptureBridgeStatus {
    return {
      enabled: this.enabled,
      running: this.server !== null,
      mode: this.mode,
      host: this.host,
      port: this.port,
      reason: this.enabled ? null : "Capture bridge is disabled by default."
    };
  }

  async start(): Promise<CaptureBridgeStatus> {
    if (!this.enabled) {
      return this.getStatus();
    }

    if (this.mode !== "localhost") {
      return {
        ...this.getStatus(),
        reason:
          "Native messaging is the preferred design but is not started by this prototype."
      };
    }

    if (this.server !== null) {
      return this.getStatus();
    }

    this.server = createServer((request, response) => {
      this.handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.port, this.host, () => resolve());
    });

    return this.getStatus();
  }

  async stop(): Promise<CaptureBridgeStatus> {
    if (this.server === null) {
      return this.getStatus();
    }

    const server = this.server;
    this.server = null;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    return this.getStatus();
  }

  private handleRequest(request: IncomingMessage, response: ServerResponse): void {
    response.setHeader("content-type", "application/json; charset=utf-8");

    if (request.method !== "POST" || request.url !== "/capture") {
      response.writeHead(404);
      response.end(JSON.stringify({ ok: false, error: "Not found." }));
      return;
    }

    if (this.token !== null && request.headers.authorization !== `Bearer ${this.token}`) {
      response.writeHead(401);
      response.end(JSON.stringify({ ok: false, error: "Unauthorized." }));
      return;
    }

    response.writeHead(501);
    response.end(
      JSON.stringify({
        ok: false,
        error:
          "Capture intake is intentionally not wired to workspace writes in the disabled prototype."
      })
    );
  }
}
