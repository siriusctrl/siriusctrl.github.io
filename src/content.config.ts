import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/notes" }),
  schema: z.object({
    translationKey: z.string(),
    language: z.enum(["en", "zh"]).default("en"),
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    artwork: z.string(),
    artworkAlt: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { notes };
