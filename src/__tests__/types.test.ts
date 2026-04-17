import { describe, it, expect } from 'vitest';

// First test that the module exists
describe('Types module existence', () => {
  it('should be able to import the types module', async () => {
    // This will fail if the module doesn't exist
    const typesModule = await import('../types');
    expect(typesModule).toBeDefined();
  });
});

import type {
  FetchOptions,
  ReaderOptions,
  Article,
  ConversionOptions,
  CliOptions,
  ConversionResult
} from '../types';

describe('Type Definitions', () => {
  describe('FetchOptions', () => {
    it('should accept optional timeout, retries, and retryDelay', () => {
      const options: FetchOptions = {
        timeout: 5000,
        retries: 2,
        retryDelay: 1000
      };
      expect(options.timeout).toBe(5000);
      expect(options.retries).toBe(2);
      expect(options.retryDelay).toBe(1000);
    });

    it('should accept empty object for all optional fields', () => {
      const options: FetchOptions = {};
      expect(options).toBeDefined();
    });
  });

  describe('ReaderOptions', () => {
    it('should require url field', () => {
      const options: ReaderOptions = {
        url: 'https://example.com'
      };
      expect(options.url).toBe('https://example.com');
    });
  });

  describe('Article', () => {
    it('should have all required fields with correct types', () => {
      const article: Article = {
        title: 'Test Title',
        byline: 'Test Author',
        content: '<p>HTML content</p>',
        textContent: 'Plain text',
        length: 100,
        excerpt: 'Test excerpt',
        siteName: 'Test Site'
      };

      expect(article.title).toBe('Test Title');
      expect(article.byline).toBe('Test Author');
      expect(article.content).toBe('<p>HTML content</p>');
      expect(article.textContent).toBe('Plain text');
      expect(article.length).toBe(100);
      expect(article.excerpt).toBe('Test excerpt');
      expect(article.siteName).toBe('Test Site');
    });

    it('should allow null for byline and siteName', () => {
      const article: Article = {
        title: 'Test',
        byline: null,
        content: '<p>Test</p>',
        textContent: 'Test',
        length: 4,
        excerpt: 'Test',
        siteName: null
      };

      expect(article.byline).toBeNull();
      expect(article.siteName).toBeNull();
    });
  });

  describe('ConversionOptions', () => {
    it('should accept optional heading, code block, and bullet list styles', () => {
      const options: ConversionOptions = {
        headingStyle: 'setext',
        codeBlockStyle: 'indented',
        bulletListMarker: '*'
      };

      expect(options.headingStyle).toBe('setext');
      expect(options.codeBlockStyle).toBe('indented');
      expect(options.bulletListMarker).toBe('*');
    });

    it('should accept atx heading style', () => {
      const options: ConversionOptions = {
        headingStyle: 'atx'
      };
      expect(options.headingStyle).toBe('atx');
    });

    it('should accept fenced code block style', () => {
      const options: ConversionOptions = {
        codeBlockStyle: 'fenced'
      };
      expect(options.codeBlockStyle).toBe('fenced');
    });

    it('should accept different bullet markers', () => {
      const options1: ConversionOptions = { bulletListMarker: '-' };
      const options2: ConversionOptions = { bulletListMarker: '+' };
      const options3: ConversionOptions = { bulletListMarker: '*' };

      expect(options1.bulletListMarker).toBe('-');
      expect(options2.bulletListMarker).toBe('+');
      expect(options3.bulletListMarker).toBe('*');
    });
  });

  describe('CliOptions', () => {
    it('should accept all optional CLI options', () => {
      const options: CliOptions = {
        output: 'output.md',
        autoName: true,
        noSanitize: false,
        timeout: 30000,
        retries: 3
      };

      expect(options.output).toBe('output.md');
      expect(options.autoName).toBe(true);
      expect(options.noSanitize).toBe(false);
      expect(options.timeout).toBe(30000);
      expect(options.retries).toBe(3);
    });

    it('should accept empty object for all optional fields', () => {
      const options: CliOptions = {};
      expect(options).toBeDefined();
    });
  });

  describe('ConversionResult', () => {
    it('should have markdown string and metadata', () => {
      const result: ConversionResult = {
        markdown: '# Test Content',
        metadata: {
          title: 'Test Title',
          author: 'John Doe',
          siteName: 'Example Site',
          url: 'https://example.com',
          extractedAt: '2024-12-12T10:00:00Z'
        }
      };

      expect(result.markdown).toBe('# Test Content');
      expect(result.metadata.title).toBe('Test Title');
      expect(result.metadata.author).toBe('John Doe');
      expect(result.metadata.siteName).toBe('Example Site');
      expect(result.metadata.url).toBe('https://example.com');
      expect(result.metadata.extractedAt).toBe('2024-12-12T10:00:00Z');
    });

    it('should allow null for author and siteName in metadata', () => {
      const result: ConversionResult = {
        markdown: '# Test',
        metadata: {
          title: 'Test',
          author: null,
          siteName: null,
          url: 'https://example.com',
          extractedAt: new Date().toISOString()
        }
      };

      expect(result.metadata.author).toBeNull();
      expect(result.metadata.siteName).toBeNull();
    });

    it('should require all non-nullable fields in metadata', () => {
      const result: ConversionResult = {
        markdown: 'test',
        metadata: {
          title: 'Required',
          author: null,
          siteName: null,
          url: 'https://required.com',
          extractedAt: '2024-01-01T00:00:00Z'
        }
      };

      expect(result.metadata.title).toBeDefined();
      expect(result.metadata.url).toBeDefined();
      expect(result.metadata.extractedAt).toBeDefined();
    });
  });

  describe('ReaderOptions — new flags', () => {
    it('accepts alwaysReadable boolean', () => {
      const opts: ReaderOptions = { alwaysReadable: true };
      expect(opts.alwaysReadable).toBe(true);
    });

    it('accepts allLinks boolean', () => {
      const opts: ReaderOptions = { allLinks: true };
      expect(opts.allLinks).toBe(true);
    });

    it('allows both flags to be omitted', () => {
      const opts: ReaderOptions = {};
      expect(opts.alwaysReadable).toBeUndefined();
      expect(opts.allLinks).toBeUndefined();
    });
  });

  describe('CliOptions — new flags', () => {
    it('accepts alwaysReadable boolean', () => {
      const opts: CliOptions = { alwaysReadable: true };
      expect(opts.alwaysReadable).toBe(true);
    });

    it('accepts allLinks boolean', () => {
      const opts: CliOptions = { allLinks: true };
      expect(opts.allLinks).toBe(true);
    });
  });
});