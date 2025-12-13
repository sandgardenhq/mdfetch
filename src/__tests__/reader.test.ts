import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readURL, ReaderError } from '../reader';
import type { ReaderOptions } from '../types';

// Mock dependencies - but we'll need the real FetchError class
vi.mock('../fetcher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../fetcher')>();
  return {
    ...actual,
    fetchHTML: vi.fn(),
  };
});
vi.mock('../readable');

describe('reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readURL', () => {
    it('should fetch HTML and return all three artifacts', async () => {
      const mockHTML = '<html><head><title>Test</title></head><body><article><p>Content</p></article></body></html>';

      // Mock fetchHTML
      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      // Mock makeReadable
      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Test Article',
        content: '<p>Content</p>',
        textContent: 'Content',
        length: 7,
        excerpt: 'Content',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      const result = await readURL('https://example.com');

      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.title).toBe('Test Article');
      expect(result.readableHTML).toBe('<p>Content</p>');
      expect(result.plainText).toBe('Content');
      expect(result.markdown).toBeDefined();
      expect(result.markdown.length).toBeGreaterThan(0);
    });

    it('should make image paths absolute before processing', async () => {
      const mockHTML = '<html><body><article><img src="/image.jpg"></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Test',
        content: '<img src="https://example.com/image.jpg">',
        textContent: '',
        length: 0,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      await readURL('https://example.com');

      expect(makeImgPathsAbsolute).toHaveBeenCalledWith('https://example.com', mockHTML);
    });

    it('should make link paths absolute before processing', async () => {
      const mockHTML = '<html><body><article><a href="/page">Link</a></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      const processedHTML = '<html><body><article><a href="https://example.com/page">Link</a></article></body></html>';
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(processedHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Test',
        content: '<a href="https://example.com/page">Link</a>',
        textContent: 'Link',
        length: 4,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      await readURL('https://example.com');

      expect(makeLinksAbsolute).toHaveBeenCalledWith('https://example.com', mockHTML);
    });

    it('should convert readable HTML to markdown', async () => {
      const mockHTML = '<html><body><article><h1>Title</h1><p>Content</p></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Title',
        content: '<h1>Title</h1><p>Content</p>',
        textContent: 'Title\nContent',
        length: 13,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      const result = await readURL('https://example.com');

      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('Content');
    });

    it('should preserve metadata in result', async () => {
      const mockHTML = '<html><body><article><p>Content</p></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Test Article',
        content: '<p>Content</p>',
        textContent: 'Content',
        length: 7,
        excerpt: 'Test excerpt',
        byline: 'John Doe',
        dir: 'ltr',
        siteName: 'Example Site',
        lang: 'en',
        publishedTime: '2024-01-01'
      });

      const result = await readURL('https://example.com');

      expect(result.title).toBe('Test Article');
      expect(result.excerpt).toBe('Test excerpt');
      expect(result.byline).toBe('John Doe');
      expect(result.siteName).toBe('Example Site');
      expect(result.lang).toBe('en');
      expect(result.publishedTime).toBe('2024-01-01');
    });

    it('should pass fetch options through to fetchHTML', async () => {
      const mockHTML = '<html><body><article><p>Content</p></article></body></html>';
      const options: ReaderOptions = {
        timeout: 5000,
        retries: 2,
        retryDelay: 500
      };

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Test',
        content: '<p>Content</p>',
        textContent: 'Content',
        length: 7,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      await readURL('https://example.com', options);

      expect(fetchHTML).toHaveBeenCalledWith('https://example.com', options);
    });

    it('should throw ReaderError when fetch fails', async () => {
      const { fetchHTML, FetchError } = await import('../fetcher');

      vi.mocked(fetchHTML).mockRejectedValue(new FetchError('Network error', 500));

      await expect(readURL('https://example.com')).rejects.toThrow(ReaderError);
      await expect(readURL('https://example.com')).rejects.toThrow('Failed to fetch URL');
    });

    it('should throw ReaderError when makeReadable fails', async () => {
      const mockHTML = '<html><body>Not enough content</body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockImplementation(() => {
        throw new Error('Failed to make article readable');
      });

      await expect(readURL('https://example.com')).rejects.toThrow(ReaderError);
      await expect(readURL('https://example.com')).rejects.toThrow('Failed to extract readable content');
    });

    it('should throw ReaderError when makeReadable returns null', async () => {
      const mockHTML = '<html><body>Content</body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue(null);

      await expect(readURL('https://example.com')).rejects.toThrow(ReaderError);
      await expect(readURL('https://example.com')).rejects.toThrow('Failed to fetch URL: Failed to extract article');
    });

    it('should handle non-Error objects thrown during processing', async () => {
      const mockHTML = '<html><body>Content</body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      await expect(readURL('https://example.com')).rejects.toThrow(ReaderError);
      await expect(readURL('https://example.com')).rejects.toThrow('An unknown error occurred');
    });

    it('should handle code blocks in markdown conversion', async () => {
      const mockHTML = '<html><body><article><pre><code>const x = 1;</code></pre></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Code Example',
        content: '<pre><code>const x = 1;</code></pre>',
        textContent: 'const x = 1;',
        length: 12,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      const result = await readURL('https://example.com');

      expect(result.markdown).toContain('```');
      expect(result.markdown).toContain('const x = 1;');
    });

    it('should handle tables in markdown conversion', async () => {
      const mockHTML = '<html><body><article><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Table Example',
        content: '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>',
        textContent: 'A B\n1 2',
        length: 7,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      const result = await readURL('https://example.com');

      // Tables should be converted to markdown table format
      expect(result.markdown).toContain('|');
      expect(result.markdown).toContain('A');
      expect(result.markdown).toContain('B');
    });

    it('should handle strikethrough text in markdown conversion', async () => {
      const mockHTML = '<html><body><article><p><del>deleted text</del></p></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Strikethrough Example',
        content: '<p><del>deleted text</del></p>',
        textContent: 'deleted text',
        length: 12,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      const result = await readURL('https://example.com');

      // GFM strikethrough (turndown-plugin-gfm uses single tilde)
      expect(result.markdown).toContain('~deleted text~');
    });

    it('should preserve calculated reading length', async () => {
      const mockHTML = '<html><body><article><p>Content</p></article></body></html>';

      const { fetchHTML } = await import('../fetcher');
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      const { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } = await import('../readable');
      vi.mocked(makeImgPathsAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeLinksAbsolute).mockReturnValue(mockHTML);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Test',
        content: '<p>Content</p>',
        textContent: 'Content',
        length: 42,
        excerpt: '',
        byline: '',
        dir: '',
        siteName: '',
        lang: '',
        publishedTime: ''
      });

      const result = await readURL('https://example.com');

      expect(result.length).toBe(42);
    });
  });

  describe('ReaderError', () => {
    it('should create error with message and original error', () => {
      const originalError = new Error('Original error');
      const error = new ReaderError('Test error', originalError);

      expect(error.message).toBe('Test error');
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('ReaderError');
    });

    it('should create error without original error', () => {
      const error = new ReaderError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.originalError).toBeUndefined();
      expect(error.name).toBe('ReaderError');
    });
  });
});
