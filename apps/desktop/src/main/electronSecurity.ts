import { validateExternalOpenUrl } from "@local-work-os/core";

export type OpenExternalUrl = (url: string) => Promise<void> | void;

export async function openAllowedExternalUrl(
  url: string,
  openExternal: OpenExternalUrl
): Promise<boolean> {
  const validation = validateExternalOpenUrl(url);

  if (!validation.ok) {
    return false;
  }

  await openExternal(validation.normalizedUrl);
  return true;
}

export function isTrustedRendererNavigationUrl(
  targetUrl: string,
  options: {
    rendererDevUrl?: string | null;
    packagedRendererUrl: string;
  }
): boolean {
  let target: URL;

  try {
    target = new URL(targetUrl);
  } catch {
    return false;
  }

  if (options.rendererDevUrl !== undefined && options.rendererDevUrl !== null) {
    try {
      const rendererDevUrl = new URL(options.rendererDevUrl);
      if (target.origin === rendererDevUrl.origin) {
        return true;
      }
    } catch {
      return false;
    }
  }

  try {
    const packagedRendererUrl = new URL(options.packagedRendererUrl);

    return (
      target.protocol === "file:" &&
      packagedRendererUrl.protocol === "file:" &&
      target.href === packagedRendererUrl.href
    );
  } catch {
    return false;
  }
}
