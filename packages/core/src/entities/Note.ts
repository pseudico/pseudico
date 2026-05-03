export const NOTE_FORMATS = ["markdown"] as const;

export type NoteFormat = (typeof NOTE_FORMATS)[number];

export function isNoteFormat(value: string): value is NoteFormat {
  return NOTE_FORMATS.includes(value as NoteFormat);
}
