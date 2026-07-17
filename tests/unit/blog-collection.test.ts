import { describe, expect, it } from 'vitest';

import { blogSchema } from '../../src/content.config';

describe('blogSchema', () => {
  it('accepts a valid post', () => {
    const result = blogSchema.safeParse({
      title: 'Understanding the naturalization timeline',
      description: 'What to expect and when.',
      pubDate: new Date('2026-08-01'),
      draft: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults draft to false', () => {
    const result = blogSchema.safeParse({
      title: 'A post',
      description: 'A description.',
      pubDate: new Date('2026-08-01'),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.draft).toBe(false);
  });

  it('rejects a post with no title', () => {
    const result = blogSchema.safeParse({
      description: 'A description.',
      pubDate: new Date('2026-08-01'),
    });
    expect(result.success).toBe(false);
  });
});
