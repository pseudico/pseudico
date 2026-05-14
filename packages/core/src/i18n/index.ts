import { englishMessages, type EnglishMessageKey } from "./en";

export type LocaleCode = "en";

export const DEFAULT_LOCALE: LocaleCode = "en";

export const SUPPORTED_LOCALES: ReadonlyArray<{
  code: LocaleCode;
  label: string;
  localName: string;
}> = [
  {
    code: "en",
    label: "English",
    localName: "English"
  }
];

export type TranslationKey = EnglishMessageKey | (string & {});
export type TranslationValues = Record<string, string | number | boolean | null | undefined>;
export type MessageCatalog = Readonly<Record<string, string>>;

export type TranslatorOptions = {
  fallbackLocale?: LocaleCode;
  locale?: LocaleCode;
  messages?: MessageCatalog;
  missingPrefix?: string;
};

export type Translator = {
  readonly locale: LocaleCode;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

export function createTranslator({
  locale = DEFAULT_LOCALE,
  messages = englishMessages,
  missingPrefix = ""
}: TranslatorOptions = {}): Translator {
  return {
    locale,
    t: (key, values) => translate(key, values, messages, missingPrefix)
  };
}

export function t(key: TranslationKey, values?: TranslationValues): string {
  return defaultTranslator.t(key, values);
}

export function translate(
  key: TranslationKey,
  values: TranslationValues = {},
  messages: MessageCatalog = englishMessages,
  missingPrefix = ""
): string {
  const template = messages[key] ?? `${missingPrefix}${key}`;

  return interpolateMessage(template, values);
}

export function interpolateMessage(
  template: string,
  values: TranslationValues = {}
): string {
  return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (match, token: string) => {
    const value = values[token];

    return value === undefined || value === null ? match : String(value);
  });
}

export function formatLocalizedDateTime(
  value: Date | string | number,
  locale: LocaleCode = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short"
  }
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatLocalizedNumber(
  value: number,
  locale: LocaleCode = DEFAULT_LOCALE,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

const defaultTranslator = createTranslator();

export { englishMessages };
