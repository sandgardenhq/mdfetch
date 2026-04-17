import { describe, it, expect, vi, beforeEach } from 'vitest';

const readabilityCtorSpy = vi.fn();
/**
 * Queue of per-call behaviors for the mocked Readability. Each item controls
 * ONE upcoming `new Readability(...)` invocation:
 *   - { type: 'real' }     → delegate to the real Readability (default)
 *   - { type: 'throwCtor' }→ throw from the constructor
 *   - { type: 'nullParse' }→ construct but make parse() return null
 * Tests that need to exercise the entity-decode retry path push two items.
 */
type ReadabilityBehavior =
  | { type: 'real' }
  | { type: 'throwCtor' }
  | { type: 'nullParse' };
const readabilityBehaviors: ReadabilityBehavior[] = [];

vi.mock('@mozilla/readability', async () => {
  const actual = await vi.importActual<typeof import('@mozilla/readability')>('@mozilla/readability');
  class SpiedReadability {
    private inner: any;
    private forceNullParse = false;
    constructor(doc: any, opts: any) {
      readabilityCtorSpy(doc, opts);
      const behavior = readabilityBehaviors.shift() ?? { type: 'real' };
      if (behavior.type === 'throwCtor') {
        throw new Error('SpiedReadability: forced constructor throw');
      }
      this.inner = new (actual.Readability as any)(doc, opts);
      this.forceNullParse = behavior.type === 'nullParse';
    }
    parse() {
      if (this.forceNullParse) return null;
      return this.inner.parse();
    }
  }
  return {
    ...actual,
    Readability: SpiedReadability
  };
});

import {
  convertToAbsoluteURL,
  makeImgPathsAbsolute,
  makeLinksAbsolute,
  makeURLAbsolute,
  makeReadable,
  type Article,
  type Link
} from '../readable';

describe('readable', () => {
  beforeEach(() => {
    // Reset the per-call behavior queue so one test can't leak into another.
    readabilityBehaviors.length = 0;
    readabilityCtorSpy.mockClear();
  });

  describe('convertToAbsoluteURL', () => {
    it('should convert relative path to absolute URL', () => {
      const result = convertToAbsoluteURL(
        'https://example.com/page',
        '/images/pic.jpg'
      );
      expect(result).toBe('https://example.com/images/pic.jpg');
    });

    it('should handle relative paths without leading slash', () => {
      const result = convertToAbsoluteURL(
        'https://example.com/dir/page.html',
        'images/pic.jpg'
      );
      expect(result).toBe('https://example.com/dir/images/pic.jpg');
    });

    it('should handle parent directory paths', () => {
      const result = convertToAbsoluteURL(
        'https://example.com/dir/subdir/page.html',
        '../images/pic.jpg'
      );
      expect(result).toBe('https://example.com/dir/images/pic.jpg');
    });

    it('should return absolute URLs unchanged', () => {
      const result = convertToAbsoluteURL(
        'https://example.com',
        'https://other.com/image.jpg'
      );
      expect(result).toBe('https://other.com/image.jpg');
    });

    it('should handle protocol-relative URLs', () => {
      const result = convertToAbsoluteURL(
        'https://example.com',
        '//cdn.example.com/image.jpg'
      );
      expect(result).toBe('https://cdn.example.com/image.jpg');
    });

    it('should preserve query parameters', () => {
      const result = convertToAbsoluteURL(
        'https://example.com',
        '/image.jpg?size=large&format=webp'
      );
      expect(result).toBe('https://example.com/image.jpg?size=large&format=webp');
    });

    it('should preserve hash fragments', () => {
      const result = convertToAbsoluteURL(
        'https://example.com',
        '/page#section'
      );
      expect(result).toBe('https://example.com/page#section');
    });
  });

  describe('makeImgPathsAbsolute', () => {
    it('should make relative image paths absolute', () => {
      const html = '<img src="/images/pic.jpg" alt="Picture">';
      const result = makeImgPathsAbsolute('https://example.com', html);
      expect(result).toContain('src="https://example.com/images/pic.jpg"');
    });

    it('should handle multiple images', () => {
      const html = `
        <img src="/img1.jpg">
        <img src="img2.jpg">
        <img src="../img3.jpg">
      `;
      const result = makeImgPathsAbsolute('https://example.com/dir/', html);
      expect(result).toContain('src="https://example.com/img1.jpg"');
      expect(result).toContain('src="https://example.com/dir/img2.jpg"');
      expect(result).toContain('src="https://example.com/img3.jpg"');
    });

    it('should leave absolute URLs unchanged', () => {
      const html = '<img src="https://other.com/image.jpg">';
      const result = makeImgPathsAbsolute('https://example.com', html);
      expect(result).toContain('src="https://other.com/image.jpg"');
    });

    it('should handle images without src attribute', () => {
      const html = '<img alt="No source">';
      const result = makeImgPathsAbsolute('https://example.com', html);
      expect(result).toContain('<img alt="No source"');
    });

    it('should handle empty src attributes', () => {
      const html = '<img src="" alt="Empty">';
      const result = makeImgPathsAbsolute('https://example.com', html);
      expect(result).toContain('src=""');
    });
  });

  describe('makeLinksAbsolute', () => {
    it('should make relative link hrefs absolute', () => {
      const html = '<a href="/page.html">Link</a>';
      const result = makeLinksAbsolute('https://example.com', html);
      expect(result).toContain('href="https://example.com/page.html"');
    });

    it('should handle multiple links', () => {
      const html = `
        <a href="/link1">Link 1</a>
        <a href="link2.html">Link 2</a>
        <a href="../link3">Link 3</a>
      `;
      const result = makeLinksAbsolute('https://example.com/dir/', html);
      expect(result).toContain('href="https://example.com/link1"');
      expect(result).toContain('href="https://example.com/dir/link2.html"');
      expect(result).toContain('href="https://example.com/link3"');
    });

    it('should leave absolute URLs unchanged', () => {
      const html = '<a href="https://other.com/page">External</a>';
      const result = makeLinksAbsolute('https://example.com', html);
      expect(result).toContain('href="https://other.com/page"');
    });

    it('should handle links without href attribute', () => {
      const html = '<a name="anchor">Anchor</a>';
      const result = makeLinksAbsolute('https://example.com', html);
      expect(result).toContain('<a name="anchor"');
    });

    it('should handle hash-only hrefs', () => {
      const html = '<a href="#section">Section</a>';
      const result = makeLinksAbsolute('https://example.com/page', html);
      expect(result).toContain('href="https://example.com/page#section"');
    });

    it('should handle mailto links unchanged', () => {
      const html = '<a href="mailto:test@example.com">Email</a>';
      const result = makeLinksAbsolute('https://example.com', html);
      expect(result).toContain('href="mailto:test@example.com"');
    });
  });

  describe('makeURLAbsolute', () => {
    it('should make arbitrary tag attributes absolute', () => {
      const html = '<video src="/video.mp4"></video>';
      const result = makeURLAbsolute('video', 'src', 'https://example.com', html);
      expect(result).toContain('src="https://example.com/video.mp4"');
    });

    it('should handle source tags', () => {
      const html = '<source src="/audio.mp3" type="audio/mpeg">';
      const result = makeURLAbsolute('source', 'src', 'https://example.com', html);
      expect(result).toContain('src="https://example.com/audio.mp3"');
    });

    it('should handle multiple matching elements', () => {
      const html = `
        <link rel="stylesheet" href="/style1.css">
        <link rel="stylesheet" href="style2.css">
      `;
      const result = makeURLAbsolute('link', 'href', 'https://example.com/dir/', html);
      expect(result).toContain('href="https://example.com/style1.css"');
      expect(result).toContain('href="https://example.com/dir/style2.css"');
    });

    it('should not modify non-matching tags', () => {
      const html = '<div href="/should-not-change">Content</div>';
      const result = makeURLAbsolute('a', 'href', 'https://example.com', html);
      expect(result).toContain('href="/should-not-change"');
    });
  });

  describe('makeReadable', () => {
    it('should extract article from well-formed HTML', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Article</title>
          <meta property="og:site_name" content="Test Site">
        </head>
        <body>
          <article>
            <h1>Article Title</h1>
            <div class="byline">By John Doe</div>
            <p>This is the main content of the article.</p>
            <p>It has multiple paragraphs.</p>
          </article>
        </body>
        </html>
      `;

      const result = makeReadable(html);

      expect(result).not.toBeNull();
      // Readability uses the <title> tag, not the h1
      expect(result?.title).toBe('Test Article');
      expect(result?.textContent).toContain('main content');
      expect(result?.textContent).toContain('multiple paragraphs');
      expect(result?.length).toBeGreaterThan(0);
    });

    it('should handle HTML with malformed entities', () => {
      const html = `
        <html>
        <head>
          <title>Title with &amp;&lt;&gt; entities</title>
        </head>
        <body>
          <article>
            <h1>Title with &amp;&lt;&gt; entities</h1>
            <p>Content with &nbsp; and other entities</p>
          </article>
        </body>
        </html>
      `;

      const result = makeReadable(html);

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Title with');
      expect(result?.textContent).toContain('Content with');
    });

    it('should extract metadata when available', () => {
      const html = `
        <html lang="en" dir="ltr">
        <head>
          <meta property="og:site_name" content="Example Site">
          <meta name="author" content="Jane Smith">
        </head>
        <body>
          <article>
            <h1>Test Article</h1>
            <div class="byline">By Jane Smith</div>
            <p>Content here</p>
          </article>
        </body>
        </html>
      `;

      const result = makeReadable(html);

      expect(result).not.toBeNull();
      expect(result?.byline).toContain('Jane Smith');
      expect(result?.siteName).toBe('Example Site');
      expect(result?.lang).toBe('en');
      expect(result?.dir).toBe('ltr');
    });

    it('should throw error when article cannot be parsed', () => {
      const html = '<div>Just a div with no content</div>';

      expect(() => makeReadable(html)).toThrow('Failed to make article readable');
    });

    it('should handle empty or minimal HTML', () => {
      const html = '<html><body></body></html>';

      expect(() => makeReadable(html)).toThrow('Failed to make article readable');
    });

    it('should provide default values for missing fields', () => {
      const html = `
        <html>
        <body>
          <article>
            <p>Just some content without title or metadata</p>
          </article>
        </body>
        </html>
      `;

      const result = makeReadable(html);

      expect(result).not.toBeNull();
      expect(result?.title).toBeDefined();
      expect(result?.byline).toBe('');
      expect(result?.siteName).toBe('');
      expect(result?.lang).toBe('');
      expect(result?.publishedTime).toBe('');
      expect(result?.excerpt).toBeDefined();
    });

    it('should handle complex nested HTML structures', () => {
      const html = `
        <html>
        <head>
          <title>Main Article</title>
        </head>
        <body>
          <header>Navigation</header>
          <main>
            <article>
              <header>
                <h1>Main Article</h1>
                <time>2024-01-01</time>
              </header>
              <section>
                <p>First section content</p>
                <blockquote>A quote</blockquote>
              </section>
              <section>
                <p>Second section content</p>
                <ul>
                  <li>List item 1</li>
                  <li>List item 2</li>
                </ul>
              </section>
            </article>
          </main>
          <footer>Footer content</footer>
        </body>
        </html>
      `;

      const result = makeReadable(html);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Main Article');
      expect(result?.textContent).toContain('First section');
      expect(result?.textContent).toContain('Second section');
      expect(result?.textContent).toContain('List item');
      expect(result?.content).toContain('<p>');
    });

    it('should preserve content HTML while extracting text', () => {
      const html = `
        <html>
        <body>
          <article>
            <h1>Title</h1>
            <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
            <pre><code>const code = "example";</code></pre>
          </article>
        </body>
        </html>
      `;

      const result = makeReadable(html);

      expect(result).not.toBeNull();
      expect(result?.content).toContain('<strong>');
      expect(result?.content).toContain('<em>');
      expect(result?.content).toContain('<code>');
      expect(result?.textContent).toContain('bold');
      expect(result?.textContent).toContain('italic');
      expect(result?.textContent).toContain('const code');
    });

    it('should handle HTML with problematic entities via error recovery path', () => {
      // HTML with deeply nested and complex entities that might trigger parsing errors
      const html = `
        <html>
        <head>
          <title>Test Article with Entities</title>
        </head>
        <body>
          <article>
            <h1>Article with HTML Entities</h1>
            <p>Content with &amp;&lt;&gt;&quot;&#39; entities and text.</p>
            <p>Additional paragraph to ensure there's enough content.</p>
            <p>More content to make the article parseable by Readability.</p>
            <p>Even more text to ensure we have sufficient content length.</p>
          </article>
        </body>
        </html>
      `;

      // This should work even if the first parsing attempt fails
      const result = makeReadable(html);

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Test Article');
      expect(result?.textContent).toContain('entities');
    });
  });

  describe('makeReadable — alwaysReadable option', () => {
    // Page with a <title> but no extractable article — Readability returns null on this.
    const emptyBodyHTML = `<html><head><title>Nothing Here</title></head><body></body></html>`;

    it('throws on a page Readability cannot parse, by default', () => {
      expect(() => makeReadable(emptyBodyHTML))
        .toThrow(/Failed to make article readable/);
    });

    it('returns a fallback article when alwaysReadable is true and Readability returns null', () => {
      const article = makeReadable(emptyBodyHTML, { alwaysReadable: true });
      expect(article).not.toBeNull();
      expect(article!.title).toBe('Nothing Here');
      // No content to salvage, but we don't throw:
      expect(article!.content).toBe('');
      expect(article!.textContent).toBe('');
    });

    it('fallback salvages body HTML when Readability returns null but body has content', () => {
      const html = `<html><head><title>Link Farm</title></head><body>
        <ul><li><a href="https://a.test/">A</a></li><li><a href="https://b.test/">B</a></li></ul>
      </body></html>`;
      const article = makeReadable(html, { alwaysReadable: true });
      expect(article!.title).toBe('Link Farm');
      expect(article!.content).toContain('a.test');
      expect(article!.content).toContain('b.test');
      expect(article!.textContent).toMatch(/A\s*B/);
    });

    it('passes charThreshold: 1 to Readability when alwaysReadable is true', () => {
      readabilityCtorSpy.mockClear();
      const html = `<html><body><article><h1>Ok</h1><p>${'x'.repeat(600)}</p></article></body></html>`;
      makeReadable(html, { alwaysReadable: true });
      expect(readabilityCtorSpy.mock.calls.at(-1)![1]).toEqual({ charThreshold: 1 });
    });

    it('does NOT pass charThreshold override by default', () => {
      readabilityCtorSpy.mockClear();
      const html = `<html><body><article><h1>Ok</h1><p>${'x'.repeat(600)}</p></article></body></html>`;
      makeReadable(html);
      expect(readabilityCtorSpy.mock.calls.at(-1)![1]).toEqual({});
    });

    it('alwaysReadable does not kick in when Readability already returns an article', () => {
      const html = `<html><head><title>Real</title></head>
        <body><article><h1>Real</h1><p>${'Lorem ipsum. '.repeat(80)}</p></article></body></html>`;
      const article = makeReadable(html, { alwaysReadable: true });
      expect(article!.title).toBe('Real');
      expect(article!.textContent).toMatch(/Lorem ipsum/);
      // Readability wraps its output in <div id="readability-page-1">...; the raw-body
      // fallback never emits that marker. Asserting on it proves Readability's output
      // (not the fallback's) is what we got back.
      expect(article!.content).toContain('readability-page-1');
    });

    it('entity-decode retry: when first Readability throws and retry returns null with alwaysReadable, fallback still produces a non-null article from the cleaned retry DOM', () => {
      // Force the catch → retry → returns-null → alwaysReadable-fallback chain:
      //   1st `new Readability(...)` throws           → enter catch block
      //   2nd `new Readability(...)` parse()→null     → fall through to fallback
      //   alwaysReadable:true                         → buildFallbackArticle runs
      //
      // NOTE on observability: the fix in readable.ts reassigns the outer `document`
      // binding to the CLEANED (retry) DOM so buildFallbackArticle sees it, not the
      // stale original. In a real browser, `textarea.innerHTML=html; textarea.value`
      // entity-decodes the raw string so the cleaned DOM's body-text differs from the
      // original's (e.g. `&amp;amp;` → `&amp;` → text `&`). linkedom, however, does
      // NOT decode via textarea (its textarea.value returns the raw unchanged), so in
      // THIS environment original and cleaned happen to have identical text. The fix
      // is still correct and observable in a real DOM; here we verify that the code
      // path executes without error and that a fallback article is returned.
      const html = `<html><head><title>Decoded</title></head><body><p>foo &amp;amp; bar</p></body></html>`;
      readabilityBehaviors.push({ type: 'throwCtor' }, { type: 'nullParse' });

      const article = makeReadable(html, { alwaysReadable: true });
      expect(article).not.toBeNull();
      expect(article!.title).toBe('Decoded');
      // Two Readability ctor invocations — confirms catch block ran the retry:
      expect(readabilityCtorSpy).toHaveBeenCalledTimes(2);
      // The fallback's body-derived content is present (proves fallback, not a thrown error):
      expect(article!.content).toContain('foo');
      expect(article!.content).toContain('bar');
    });

    it('entity-decode retry: non-alwaysReadable still throws when both attempts fail', () => {
      const html = `<html><head><title>X</title></head><body><p>&amp;amp;</p></body></html>`;
      readabilityBehaviors.push({ type: 'throwCtor' }, { type: 'nullParse' });
      expect(() => makeReadable(html)).toThrow(/Failed to make article readable/);
    });

    it('entity-decode retry: successful retry returns the article (covers catch → parse-returns-article path)', () => {
      // First call throws, second call succeeds with real Readability on a long article.
      const html = `<html><head><title>Recovered</title></head>
        <body><article><h1>Recovered</h1><p>${'Lorem ipsum dolor sit amet. '.repeat(60)}</p></article></body></html>`;
      readabilityBehaviors.push({ type: 'throwCtor' });  // only first call throws
      const article = makeReadable(html);
      expect(article).not.toBeNull();
      expect(article!.title).toBe('Recovered');
      expect(article!.textContent).toMatch(/Lorem ipsum/);
    });
  });

  describe('Article interface', () => {
    it('should have all required fields', () => {
      const article: Article = {
        title: 'Test',
        content: '<p>HTML content</p>',
        textContent: 'Plain text',
        length: 10,
        excerpt: 'Excerpt',
        byline: 'Author',
        dir: 'ltr',
        siteName: 'Site',
        lang: 'en',
        publishedTime: '2024-01-01'
      };

      expect(article.title).toBe('Test');
      expect(article.content).toBe('<p>HTML content</p>');
      expect(article.textContent).toBe('Plain text');
      expect(article.length).toBe(10);
      expect(article.excerpt).toBe('Excerpt');
      expect(article.byline).toBe('Author');
      expect(article.dir).toBe('ltr');
      expect(article.siteName).toBe('Site');
      expect(article.lang).toBe('en');
      expect(article.publishedTime).toBe('2024-01-01');
    });
  });

  describe('Link interface', () => {
    it('should have title and url fields', () => {
      const link: Link = {
        title: 'Example Link',
        url: 'https://example.com'
      };

      expect(link.title).toBe('Example Link');
      expect(link.url).toBe('https://example.com');
    });
  });
});