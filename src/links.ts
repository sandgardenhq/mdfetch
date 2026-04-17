import { parseHTML } from 'linkedom';

export interface Link {
  url: string;
  text: string;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|ico|avif|bmp)$/i;

function isExtractableURL(href: string): boolean {
  if (!href) return false;
  if (href.startsWith('#')) return false;

  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (IMAGE_EXTENSIONS.test(parsed.pathname)) return false;
  return true;
}

function normalizeText(raw: string, fallback: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : fallback;
}

export function extractLinks(html: string): Link[] {
  const { document } = parseHTML(html) as any;
  const anchors: any[] = Array.from(document.querySelectorAll('a'));

  const seen = new Set<string>();
  const out: Link[] = [];
  for (const a of anchors) {
    const href = a.getAttribute('href') ?? '';
    if (!isExtractableURL(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ url: href, text: normalizeText(a.textContent ?? '', href) });
  }
  return out;
}

export function extractTitle(html: string): string {
  const { document } = parseHTML(html) as any;
  const el = document.querySelector('title');
  return (el?.textContent ?? '').trim();
}

function escapeBrackets(text: string): string {
  return text.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

export function formatAsFootnotes(links: Link[]): string {
  return links
    .map((l, i) => `[^${i + 1}]: [${escapeBrackets(l.text)}](${l.url})`)
    .join('\n');
}
