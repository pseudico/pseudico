import type {
  BrowserCaptureIntakeInput,
  BrowserCaptureIntakeResult
} from "./CaptureIntakeService";

export type NativeCaptureMessage = {
  type: "capture";
  token: string;
  format?: "link" | "task";
  payload: BrowserCaptureIntakeInput["payload"];
  target?: BrowserCaptureIntakeInput["target"];
};

export type NativeMessagingResponse =
  | {
      ok: true;
      data: BrowserCaptureIntakeResult;
    }
  | {
      ok: false;
      error: {
        code: "INVALID_MESSAGE" | "UNAUTHORIZED" | "CAPTURE_FAILED";
        message: string;
      };
    };

export type NativeCaptureHandler = (
  input: BrowserCaptureIntakeInput
) => Promise<BrowserCaptureIntakeResult>;

export class NativeMessagingService {
  private readonly token: string;
  private readonly capture: NativeCaptureHandler;

  constructor(input: { token: string; capture: NativeCaptureHandler }) {
    const token = input.token.trim();

    if (token.length < 24) {
      throw new Error("Native messaging token must be at least 24 characters.");
    }

    this.token = token;
    this.capture = input.capture;
  }

  async handleMessage(message: unknown): Promise<NativeMessagingResponse> {
    const parsed = parseNativeCaptureMessage(message);

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.message.token !== this.token) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Capture token was rejected."
        }
      };
    }

    try {
      const intakeInput = {
        format: parsed.message.format ?? "link",
        payload: parsed.message.payload,
        ...(parsed.message.target === undefined
          ? {}
          : { target: parsed.message.target })
      };
      const data = await this.capture(intakeInput);

      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "CAPTURE_FAILED",
          message:
            error instanceof Error ? error.message : "Browser capture failed."
        }
      };
    }
  }
}

function parseNativeCaptureMessage(
  value: unknown
):
  | { ok: true; message: NativeCaptureMessage }
  | Extract<NativeMessagingResponse, { ok: false }> {
  if (!isRecord(value)) {
    return invalid("Native message must be an object.");
  }

  if (value.type !== "capture") {
    return invalid("Native message type must be capture.");
  }

  if (typeof value.token !== "string" || value.token.trim().length === 0) {
    return invalid("Native message token is required.");
  }

  if (
    value.format !== undefined &&
    value.format !== "link" &&
    value.format !== "task"
  ) {
    return invalid("Native message format must be link or task.");
  }

  if (!isRecord(value.payload)) {
    return invalid("Native message payload is required.");
  }

  if (typeof value.payload.sourceUrl !== "string") {
    return invalid("Native message payload.sourceUrl is required.");
  }

  return {
    ok: true,
    message: {
      type: "capture",
      token: value.token,
      ...(value.format === undefined ? {} : { format: value.format }),
      payload: value.payload as NativeCaptureMessage["payload"],
      ...(isRecord(value.target)
        ? { target: value.target as NativeCaptureMessage["target"] }
        : {})
    }
  };
}

function invalid(
  message: string
): Extract<NativeMessagingResponse, { ok: false }> {
  return {
    ok: false,
    error: {
      code: "INVALID_MESSAGE",
      message
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
