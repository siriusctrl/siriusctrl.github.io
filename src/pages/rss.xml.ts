import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { noteHref } from "../data/notes";

export async function GET(context: { site: URL }) {
  const notes = (await getCollection("notes", ({ data }) => !data.draft && data.language === "en"))
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
  return rss({
    title: "Working Set writing",
    description: "Writing about software architecture, interaction design, and practical experiments.",
    site: context.site,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.publishedAt,
      link: noteHref(note),
    })),
  });
}
