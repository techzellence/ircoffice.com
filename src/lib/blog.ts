export function readingMinutes(body = ''): number {
  return Math.max(1, Math.ceil(body.replace(/<[^>]*>/g, '').replace(/\]\([^)]*\)/g, ']').trim().split(/\s+/).length / 200));
}
export function publicationDate(date: Date): string {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}
