import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type {
  BrowserCaptureIntakeInput,
  BrowserCaptureIntakeResult,
  BrowserCaptureTargetInput
} from "./capture/CaptureIntakeService";

export type CaptureBridgeMode = "native_messaging" | "localhost";

export type CaptureBridgeConfig = {
  enabled?: boolean;
  mode?: CaptureBridgeMode;
  host?: string;
  port?: number;
  token?: string | null;
  capture?: (input: BrowserCaptureIntakeInput) => Promise<BrowserCaptureIntakeResult>;
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
const MAX_CAPTURE_BODY_BYTES = 64 * 1024;

export class CaptureBridge {
  private readonly enabled: boolean;
  private readonly mode: CaptureBridgeMode;
  private readonly host: string;
  private readonly port: number;
  private readonly token: string | null;
  private readonly capture:
    | ((input: BrowserCaptureIntakeInput) => Promise<BrowserCaptureIntakeResult>)
    | null;
  private server: Server | null = null;

  constructor(config: CaptureBridgeConfig = {}) {
    this.enabled = config.enabled ?? false;
    this.mode = config.mode ?? "native_messaging";
    this.host = config.host ?? DEFAULT_HOST;
    this.port = config.port ?? DEFAULT_PORT;
    this.token = config.token ?? null;
    this.capture = config.capture ?? null;
  }

  getStatus(): CaptureBridgeStatus {
    return {
      enabled: this.enabled,
      running: this.server !== null,
      mode: this.mode,
      host: this.host,
      port: this.getBoundPort(),
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
          "Native messaging is processed by the native host command and does not start a localhost listener."
      };
    }

    if (!isLoopbackHost(this.host)) {
      return {
        ...this.getStatus(),
        reason: "Capture bridge localhost mode must bind to 127.0.0.1 or ::1."
      };
    }

    if (this.token === null || this.token.trim().length < 24) {
      return {
        ...this.getStatus(),
        reason: "Capture bridge requires a pairing token before it can start."
      };
    }

    if (this.capture === null) {
      return {
        ...this.getStatus(),
        reason: "Capture bridge requires a capture handler before it can start."
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
    void this.handleRequestAsync(request, response);
  }

  private async handleRequestAsync(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");

    if (request.method !== "POST" || request.url !== "/capture") {
      response.writeHead(404);
      response.end(JSON.stringify({ ok: false, error: "Not found." }));
      return;
    }

    if (request.headers.authorization !== `Bearer ${this.token}`) {
      response.writeHead(401);
      response.end(JSON.stringify({ ok: false, error: "Unauthorized." }));
      return;
    }

    try {
      const body = await readJsonBody(request);
      const input = parseCaptureRequest(body);
      const result = await this.capture?.(input);

      if (result === undefined) {
        response.writeHead(503);
        response.end(JSON.stringify({ ok: false, error: "Capture unavailable." }));
        return;
      }

      response.writeHead(200);
      response.end(JSON.stringify({ ok: true, data: result }));
    } catch (error) {
      response.writeHead(400);
      response.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : "Invalid capture request."
        })
      );
    }
  }

  private getBoundPort(): number {
    if (this.server === null) {
      return this.port;
    }

    const address = this.server.address();

    return typeof address === "object" && address !== null
      ? address.port
      : this.port;
  }
}

function parseCaptureRequest(value: unknown): BrowserCaptureIntakeInput {
  if (!isRecord(value)) {
    throw new Error("Capture request body must be an object.");
  }

  if (value.format !== "link" && value.format !== "task") {
    throw new Error("Capture request format must be link or task.");
  }

  if (!isRecord(value.payload)) {
    throw new Error("Capture request payload is required.");
  }

  if (typeof value.payload.sourceUrl !== "string") {
    throw new Error("Capture request payload.sourceUrl is required.");
  }

  const input = {
    format: value.format as BrowserCaptureIntakeInput["format"],
    payload: value.payload as BrowserCaptureIntakeInput["payload"],
    ...(isRecord(value.target)
      ? { target: value.target as BrowserCaptureTargetInput }
      : {})
  };

  return input;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > MAX_CAPTURE_BODY_BYTES) {
      throw new Error("Capture request body is too large.");
    }

    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Error("Capture request body must be valid JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}
