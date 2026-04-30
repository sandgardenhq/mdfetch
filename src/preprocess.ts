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
 *
 * @param html - Raw HTML string
 * @returns Transformed HTML string
 */
export function preprocessForReadability(html: string): string {
  const r: any = parseHTML(html);
  const document: Document = r.document;

  promoteDataAsParagraphs(document);

  return document.toString();
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
