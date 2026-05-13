export const ALLOWED_EXTERNAL_URL_PROTOCOLS = ["http:", "https:", "mailto:"] as const;

export type AllowedExternalUrlProtocol =
  (typeof ALLOWED_EXTERNAL_URL_PROTOCOLS)[number];

const BLOCKED_LOCAL_PATH_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-z]:[\\/]/i;
const WINDOWS_UNC_PATH_PATTERN = /^\\\\[^\\/?*:|"<>]+\\[^\\/?*:|"<>]+/;
const POSIX_ABSOLUTE_PATH_PATTERN = /^\//;

export type ExternalUrlValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
      protocol: AllowedExternalUrlProtocol;
    }
  | {
      ok: false;
      reason: string;
    };

export function validateExternalOpenUrl(
  input: unknown
): ExternalUrlValidationResult {
  if (typeof input !== "string") {
    return {
      ok: false,
      reason: "External URL must be a string."
    };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0 || trimmed.includes("\0")) {
    return {
      ok: false,
      reason: "External URL must be a non-empty URL without null bytes."
    };
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: "External URL must be absolute."
    };
  }

  if (!isAllowedExternalUrlProtocol(parsed.protocol)) {
    return {
      ok: false,
      reason: "External URL protocol is not allowed."
    };
  }

  if (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    (parsed.username.length > 0 || parsed.password.length > 0)
  ) {
    return {
      ok: false,
      reason: "External URL credentials are not allowed."
    };
  }

  return {
    ok: true,
    normalizedUrl: parsed.toString(),
    protocol: parsed.protocol
  };
}

export function isAllowedExternalUrlProtocol(
  protocol: string
): protocol is AllowedExternalUrlProtocol {
  return ALLOWED_EXTERNAL_URL_PROTOCOLS.includes(
    protocol as AllowedExternalUrlProtocol
  );
}

export function isSafeLocalFilePath(input: unknown): input is string {
  if (typeof input !== "string") {
    return false;
  }

  const trimmed = input.trim();

  if (trimmed.length === 0 || trimmed.includes("\0")) {
    return false;
  }

  if (/^(?:https?|mailto|file|data|javascript|vbscript|blob|chrome|devtools):/i.test(trimmed)) {
    return false;
  }

  const isWindowsAbsolutePath = WINDOWS_ABSOLUTE_PATH_PATTERN.test(trimmed);
  const isAbsoluteLocalPath =
    isWindowsAbsolutePath ||
    WINDOWS_UNC_PATH_PATTERN.test(trimmed) ||
    POSIX_ABSOLUTE_PATH_PATTERN.test(trimmed);
  const hasBlockedScheme =
    !isWindowsAbsolutePath && BLOCKED_LOCAL_PATH_SCHEME_PATTERN.test(trimmed);

  return isAbsoluteLocalPath && !hasBlockedScheme;
}

export function areSafeLocalFilePaths(input: unknown): input is string[] {
  return Array.isArray(input) && input.length > 0 && input.every(isSafeLocalFilePath);
}
