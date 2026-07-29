import type { CollectionEntry } from "astro:content";

export type NoteEntry = CollectionEntry<"notes">;
export type NoteLanguage = NoteEntry["data"]["language"];

export const noteSlug = (note: NoteEntry) => {
  const prefix = `${note.data.language}/`;
  return note.id.startsWith(prefix) ? note.id.slice(prefix.length) : note.id;
};

export const noteHref = (note: NoteEntry) => {
  const slug = noteSlug(note);
  return note.data.language === "zh" ? `/zh/notes/${slug}/` : `/notes/${slug}/`;
};

export const noteTranslationHrefs = (notes: NoteEntry[], translationKey: string) =>
  Object.fromEntries(
    notes
      .filter((note) => note.data.translationKey === translationKey)
      .map((note) => [note.data.language, noteHref(note)]),
  ) as Partial<Record<NoteLanguage, string>>;
