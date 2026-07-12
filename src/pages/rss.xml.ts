import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context: { site: URL }) {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  return rss({
    title: "Sirius Ctrl notes",
    description: "Writing about software architecture, interaction design, and practical experiments.",
    site: context.site,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.publishedAt,
      link: `/notes/${note.id}/`,
    })),
  });
}
