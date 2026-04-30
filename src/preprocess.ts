/**
 * HTML preprocessor that runs before Mozilla Readability to preserve content
 * Readability would otherwise prune.
 *
 * Currently only invoked from {@link readURL} when `wrapImages` is set.
 */

import { parseHTML } from 'linkedom';

/**
 * Apply preprocessing transforms to HTML in preparation for Readability.
 *
 * Transforms applied:
 * 1. `<span data-as="p">…</span>` → `<p>…</p>` (Mintlify hint)
 * 2. Wrap content `<img>` tags in `<figure>` so Readability scores them as
 *    content (instead of pruning image-only containers). Skips images in
 *    `<nav>`/`<header>`/`<aside>`/`<footer>`, images whose own or any
 *    ancestor's class names contain the words `logo`, `icon`, `avatar`, or
 *    `sprite` (whole-word match), and images already inside `<figure>` or
 *    `<picture>`.
 *
 * @param html - Raw HTML string
 * @returns Transformed HTML string
 */
export function preprocessForReadability(html: string): string {
  const r: any = parseHTML(html);
  const document: Document = r.document;

  promoteDataAsParagraphs(document);
  wrapImagesInFigure(document);

  return document.toString();
}

const SKIP_ANCESTOR_TAGS = new Set(['NAV', 'HEADER', 'ASIDE', 'FOOTER']);
const SKIP_CLASS_RE = /\b(logo|icon|avatar|sprite)\b/i;

function shouldSkipImage(img: any): boolean {
  const parent = img.parentNode;
  if (parent && parent.nodeType === 1) {
    const parentTag = (parent.tagName || '').toUpperCase();
    if (parentTag === 'FIGURE' || parentTag === 'PICTURE') return true;
  }
  let node: any = img;
  while (node && node.nodeType === 1) {
    const tag = (node.tagName || '').toUpperCase();
    if (node !== img && SKIP_ANCESTOR_TAGS.has(tag)) return true;
    const klass = typeof node.getAttribute === 'function' ? node.getAttribute('class') : null;
    if (klass && SKIP_CLASS_RE.test(klass)) return true;
    node = node.parentNode;
  }
  return false;
}

function wrapImagesInFigure(document: Document): void {
  const imgs = Array.from(document.querySelectorAll('img')) as any[];
  for (const img of imgs) {
    if (shouldSkipImage(img)) continue;
    const parent = img.parentNode;
    if (!parent) continue;
    const fig = document.createElement('figure');
    parent.replaceChild(fig, img);
    fig.appendChild(img);
  }
}

function promoteDataAsParagraphs(document: Document): void {
  const spans = document.querySelectorAll('span[data-as="p"]');
  spans.forEach((span: any) => {
    const p = document.createElement('p');
    for (const attr of Array.from(span.attributes) as Attr[]) {
      if (attr.name === 'data-as') continue;
      p.setAttribute(attr.name, attr.value);
    }
    while (span.firstChild) {
      p.appendChild(span.firstChild);
    }
    span.parentNode!.replaceChild(p, span);
  });
}
