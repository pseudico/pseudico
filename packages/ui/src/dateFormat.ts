const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatAustralianDate(value: string | null | undefined): string {
  if (value == null || value.trim().length === 0) {
    return "No due date";
  }

  const match = DATE_ONLY_PATTERN.exec(value);
  if (match !== null) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatAustralianDateTime(value: string | null | undefined): string {
  if (value == null || value.trim().length === 0) {
    return "No date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatAustralianDate(value);
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
