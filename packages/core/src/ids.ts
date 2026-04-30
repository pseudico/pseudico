export function createLocalId(
  prefix: string,
  date: Date = new Date(),
  random: () => number = Math.random
): string {
  const safePrefix = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = date.getTime().toString(36);
  const entropy = Math.floor(random() * Number.MAX_SAFE_INTEGER)
    .toString(36)
    .padStart(11, "0")
    .slice(0, 11);

  return `${safePrefix}_${timestamp}_${entropy}`;
}
