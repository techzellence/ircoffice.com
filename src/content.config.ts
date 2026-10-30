import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

export const blogSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  pubDate: z.coerce.date(),
  draft: z.boolean().default(false),
  category: z.enum(['Practical guide', 'History']).default('Practical guide'),
  featured: z.boolean().default(false),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { blog };
