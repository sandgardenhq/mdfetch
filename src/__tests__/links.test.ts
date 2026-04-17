import { describe, it, expect } from 'vitest';
import { extractLinks, extractTitle, formatAsFootnotes } from '../links.js';

describe('extractLinks', () => {
  it('returns empty array when there are no links', () => {
    expect(extractLinks('<html><body><p>no links</p></body></html>')).toEqual([]);
  });

  it('extracts http and https links with their text', () => {
    const html = `<a href="http://a.test/one">One</a><a href="https://b.test/two">Two</a>`;
    expect(extractLinks(html)).toEqual([
      { url: 'http://a.test/one', text: 'One' },
      { url: 'https://b.test/two', text: 'Two' }
    ]);
  });

  it('skips anchor-only links', () => {
    expect(extractLinks(`<a href="#section">Jump</a>`)).toEqual([]);
  });

  it('skips mailto, javascript, tel, data, ftp', () => {
    const html = `
      <a href="mailto:x@y.com">mail</a>
      <a href="javascript:void(0)">js</a>
      <a href="tel:+15555555555">phone</a>
      <a href="data:text/plain,hi">data</a>
      <a href="ftp://ftp.test/file">ftp</a>`;
    expect(extractLinks(html)).toEqual([]);
  });

  it('skips links pointing at images regardless of case or query string', () => {
    const html = `
      <a href="https://cdn.test/pic.JPG">jpg</a>
      <a href="https://cdn.test/pic.jpeg?v=1">jpeg</a>
      <a href="https://cdn.test/pic.png">png</a>
      <a href="https://cdn.test/pic.gif">gif</a>
      <a href="https://cdn.test/pic.webp">webp</a>
      <a href="https://cdn.test/pic.svg">svg</a>
      <a href="https://cdn.test/pic.ico">ico</a>
      <a href="https://cdn.test/pic.avif">avif</a>
      <a href="https://cdn.test/pic.bmp">bmp</a>`;
    expect(extractLinks(html)).toEqual([]);
  });

  it('deduplicates by URL, keeping first occurrence text and document order', () => {
    const html = `
      <a href="https://a.test/x">First</a>
      <a href="https://b.test/y">B</a>
      <a href="https://a.test/x">Second</a>`;
    expect(extractLinks(html)).toEqual([
      { url: 'https://a.test/x', text: 'First' },
      { url: 'https://b.test/y', text: 'B' }
    ]);
  });

  it('skips empty hrefs', () => {
    expect(extractLinks(`<a href="">empty</a><a>no href</a>`)).toEqual([]);
  });

  it('uses href as text fallback when anchor text is empty/whitespace', () => {
    const html = `<a href="https://a.test/img-wrap"><img src="x.png"></a>`;
    expect(extractLinks(html)).toEqual([
      { url: 'https://a.test/img-wrap', text: 'https://a.test/img-wrap' }
    ]);
  });

  it('trims and collapses whitespace in link text', () => {
    const html = `<a href="https://a.test/">  Hello\n  world  </a>`;
    expect(extractLinks(html)).toEqual([
      { url: 'https://a.test/', text: 'Hello world' }
    ]);
  });

  // Covers links.ts the `new URL()` catch branch — `new URL('/relative')` throws
  // without a base. extractLinks runs after makeLinksAbsolute in readURL so these
  // are rare in practice, but the filter must still reject them if they slip through.
  it('skips relative paths that fail to parse as absolute URLs', () => {
    expect(extractLinks('<a href="/relative">rel</a>')).toEqual([]);
  });

  it('skips protocol-relative paths that fail to parse as absolute URLs', () => {
    expect(extractLinks('<a href="//protocol-relative/foo">rel</a>')).toEqual([]);
  });

  it('skips arbitrary malformed hrefs', () => {
    expect(extractLinks('<a href="http://[not a url">bad</a>')).toEqual([]);
  });
});

describe('formatAsFootnotes', () => {
  it('returns empty string for empty array', () => {
    expect(formatAsFootnotes([])).toBe('');
  });

  it('formats a single link as footnote 1', () => {
    expect(formatAsFootnotes([{ url: 'https://a.test/', text: 'A' }]))
      .toBe('[^1]: [A](https://a.test/)');
  });

  it('numbers footnotes sequentially starting at 1', () => {
    const out = formatAsFootnotes([
      { url: 'https://a.test/', text: 'A' },
      { url: 'https://b.test/', text: 'B' },
      { url: 'https://c.test/', text: 'C' }
    ]);
    expect(out).toBe(
      '[^1]: [A](https://a.test/)\n' +
      '[^2]: [B](https://b.test/)\n' +
      '[^3]: [C](https://c.test/)'
    );
  });

  it('escapes square brackets in link text', () => {
    expect(formatAsFootnotes([{ url: 'https://a.test/', text: 'foo [bar] baz' }]))
      .toBe('[^1]: [foo \\[bar\\] baz](https://a.test/)');
  });
});

describe('extractTitle', () => {
  it('returns the <title> text trimmed', () => {
    expect(extractTitle('<html><head><title>  Hi  </title></head></html>')).toBe('Hi');
  });

  it('returns empty string when <title> is missing', () => {
    expect(extractTitle('<html><body></body></html>')).toBe('');
  });
});
