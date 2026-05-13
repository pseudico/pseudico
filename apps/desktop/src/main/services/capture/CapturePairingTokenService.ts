import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type CapturePairingTokenRecord = {
  token: string;
  createdAt: string;
  updatedAt: string;
};

export class CapturePairingTokenService {
  private readonly tokenPath: string;
  private readonly now: () => Date;

  constructor(input: { tokenPath: string; now?: () => Date }) {
    this.tokenPath = input.tokenPath;
    this.now = input.now ?? (() => new Date());
  }

  async getOrCreateToken(): Promise<CapturePairingTokenRecord> {
    const existing = await this.readToken();

    if (existing !== null) {
      return existing;
    }

    return await this.rotateToken();
  }

  async rotateToken(): Promise<CapturePairingTokenRecord> {
    const timestamp = this.now().toISOString();
    const record = {
      token: createPairingToken(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await mkdir(dirname(this.tokenPath), { recursive: true });
    await writeFile(this.tokenPath, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });

    return record;
  }

  async verifyToken(candidate: string): Promise<boolean> {
    const record = await this.readToken();

    if (record === null || candidate.trim().length === 0) {
      return false;
    }

    return safeEqual(record.token, candidate.trim());
  }

  private async readToken(): Promise<CapturePairingTokenRecord | null> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await readFile(this.tokenPath, "utf8")) as unknown;
    } catch {
      return null;
    }

    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.token !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    if (parsed.token.length < 32) {
      return null;
    }

    return {
      token: parsed.token,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt
    };
  }
}

function createPairingToken(): string {
  return randomBytes(32).toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.byteLength === rightBuffer.byteLength &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
