export function createIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}
