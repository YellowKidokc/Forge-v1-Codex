import { NoteMetadata } from './types';

const TAG_RE = /(^|\s)#([A-Za-z0-9/_-]+)/g;
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function extractNoteMetadata(markdown: string): NoteMetadata {
  const tags: string[] = [];
  const links: string[] = [];

  for (const match of markdown.matchAll(TAG_RE)) {
    const tag = match[2]?.trim();
    if (tag) {
      tags.push(tag);
    }
  }

  for (const match of markdown.matchAll(WIKILINK_RE)) {
    const link = match[1]?.trim();
    if (link) {
      links.push(link);
    }
  }

  return {
    tags: dedupe(tags),
    links: dedupe(links),
  };
}
