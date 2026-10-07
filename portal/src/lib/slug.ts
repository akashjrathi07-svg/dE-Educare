/** Same rule as the WordPress theme's de_slugify(): "Time, Speed & Distance" → "time-speed-and-distance". */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
