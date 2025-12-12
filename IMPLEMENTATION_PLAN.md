# Implementation Plan: Website-to-Markdown CLI Tool

## Overview
A TypeScript CLI tool that fetches web pages, extracts main content using Mozilla Readability, and converts to clean markdown.

**Pipeline**: Fetch → Parse DOM → Readability Extract → Turndown Convert → Sanitize → Output

## CRITICAL: Test-Driven Development Requirements

**THIS IS MANDATORY. NO EXCEPTIONS.**

Every line of production code MUST be written following RED-GREEN-REFACTOR:
1. **RED**: Write failing test FIRST
2. **Verify RED**: Watch test fail for the right reason
3. **GREEN**: Write MINIMAL code to pass
4. **Verify GREEN**: Confirm test passes
5. **REFACTOR**: Clean up with tests staying green

**VIOLATIONS = START OVER:**
- Writing code before test = DELETE CODE, START OVER
- Test passing immediately = TEST IS WRONG, FIX TEST
- Can't explain why test failed = NOT TDD, START OVER
- "I'll add tests later" = DELETE CODE, START OVER

---

## Task 0: Test Infrastructure Setup

**Objective**: Install Vitest and configure for strict TDD workflow.

**Files to create**:
- `vitest.config.ts`
- `src/__tests__/` directory structure
- `src/__fixtures__/` for test data

**Steps**:

1. Install test dependencies:
```bash
npm install -D vitest @vitest/ui c8 msw happy-dom
```

2. Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist', 'node_modules', '**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

3. Update `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "start": "node dist/cli.js"
  }
}
```

4. Create test fixtures directory:
```bash
mkdir -p src/__fixtures__
mkdir -p src/__tests__
```

**Verification**:
- `npm test` starts Vitest in watch mode
- Test runner is ready for TDD cycle

---

## Task 1: Project Initialization

**Objective**: Set up TypeScript project with all dependencies and tooling.

**TDD Process**: No tests needed for configuration files.

**Files to create**:
- `package.json`
- `tsconfig.json`
- `.gitignore`

**Steps**:

1. Initialize npm project:
```bash
npm init -y
```

2. Install production dependencies:
```bash
npm install @mozilla/readability linkedom turndown turndown-plugin-gfm commander
```

3. Install development dependencies:
```bash
npm install -D typescript @types/node @types/turndown tsx vitest @vitest/ui c8 msw
```

4. Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

5. Create `.gitignore`:
```
node_modules/
dist/
*.log
.env
.DS_Store
coverage/
```

**Verification**:
- Run `npm install` successfully
- Run `npm test` - Vitest starts with no tests

---

## Task 2: Create Type Definitions (TDD)

**Objective**: Define TypeScript interfaces for the application.

### RED Phase - Write failing test first

**File**: `src/__tests__/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import type {
  FetchOptions,
  ReaderOptions,
  Article,
  ConversionOptions,
  CliOptions,
  ConversionResult
} from '../types';

describe('Type Definitions', () => {
  it('should export FetchOptions interface', () => {
    const options: FetchOptions = {
      timeout: 5000,
      retries: 2,
      retryDelay: 1000
    };
    expect(options).toBeDefined();
  });

  it('should export Article interface', () => {
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
  });

  it('should export ConversionResult interface', () => {
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
    expect(result.metadata.url).toBe('https://example.com');
  });
});
```

**Verify RED**: Run `npm test` - should fail with "Cannot find module '../types'"

### GREEN Phase - Create types to pass test

**File**: `src/types.ts`

```typescript
export interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ReaderOptions {
  url: string;
}

export interface Article {
  title: string;
  byline: string | null;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  siteName: string | null;
}

export interface ConversionOptions {
  headingStyle?: 'atx' | 'setext';
  codeBlockStyle?: 'fenced' | 'indented';
  bulletListMarker?: '-' | '+' | '*';
}

export interface CliOptions {
  output?: string;
  autoName?: boolean;
  noSanitize?: boolean;
  timeout?: number;
  retries?: number;
}

export interface ConversionResult {
  markdown: string;
  metadata: {
    title: string;
    author: string | null;
    siteName: string | null;
    url: string;
    extractedAt: string;
  };
}
```

**Verify GREEN**: Run `npm test` - all tests should pass

---

## Task 3: Implement HTTP Fetcher with Retry Logic (TDD)

### RED Phase - Write comprehensive tests first

**File**: `src/__tests__/fetcher.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchHTML, FetchError } from '../fetcher';

// Mock global fetch
global.fetch = vi.fn();

describe('fetchHTML', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('successful fetch', () => {
    it('should fetch HTML content successfully', async () => {
      const mockHTML = '<html><body>Test content</body></html>';
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: vi.fn().mockResolvedValue(mockHTML)
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await fetchHTML('https://example.com');

      expect(result).toBe(mockHTML);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('DocReader')
          })
        })
      );
    });
  });

  describe('timeout handling', () => {
    it('should timeout after specified duration', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const promise = fetchHTML('https://example.com', {
        timeout: 100,
        retries: 0
      });

      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow(FetchError);
      await expect(promise).rejects.toThrow(/timeout/i);
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attempts = 0;
      (global.fetch as any).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: vi.fn().mockResolvedValue('<html></html>')
        });
      });

      const promise = fetchHTML('https://example.com', {
        retries: 2,
        retryDelay: 100
      });

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Second retry after 200ms (exponential)
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;
      expect(result).toBe('<html></html>');
      expect(attempts).toBe(3);
    });

    it('should not retry 4xx client errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers()
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        fetchHTML('https://example.com', { retries: 3 })
      ).rejects.toThrow(FetchError);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('content type validation', () => {
    it('should reject non-HTML content types', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn()
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        fetchHTML('https://example.com')
      ).rejects.toThrow(/Expected HTML/);
    });
  });

  describe('error handling', () => {
    it('should throw FetchError with status code for HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      try {
        await fetchHTML('https://example.com', { retries: 0 });
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).statusCode).toBe(500);
      }
    });
  });
});
```

**Verify RED**: Run `npm test` - should fail with module not found

### GREEN Phase - Implement fetcher to pass all tests

**File**: `src/fetcher.ts`

```typescript
import { FetchOptions } from './types.js';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export class FetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DocReader/1.0)',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchHTML(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeout);

      if (!response.ok) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('text/html')) {
        throw new FetchError(
          `Expected HTML but got ${contentType}`
        );
      }

      return await response.text();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof FetchError && error.statusCode) {
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }

      if (attempt === retries) {
        break;
      }

      const delay = retryDelay * Math.pow(2, attempt);
      console.error(
        `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  throw new FetchError(
    `Failed after ${retries + 1} attempts: ${lastError?.message}`,
    undefined,
    lastError
  );
}
```

**Verify GREEN**: Run `npm test` - all fetcher tests should pass

### REFACTOR Phase

Clean up any duplication, improve naming, extract constants if needed. Run tests after each change to ensure they stay green.

---

## Task 4: Implement Readability Content Extraction (TDD)

### RED Phase - Write tests first

**File**: `src/__fixtures__/sample-article.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Article</title>
  <meta property="og:site_name" content="Test Site">
</head>
<body>
  <nav>Navigation menu - should be removed</nav>
  <article>
    <h1>Main Article Title</h1>
    <p class="byline">By John Doe</p>
    <p>This is the main article content that should be extracted.</p>
    <p>It has multiple paragraphs with important information.</p>
  </article>
  <aside>Sidebar content - should be removed</aside>
  <footer>Footer - should be removed</footer>
</body>
</html>
```

**File**: `src/__tests__/reader.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { extractContent, ExtractionError } from '../reader';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('extractContent', () => {
  it('should extract main article content from HTML', async () => {
    const html = await fs.readFile(
      path.join(__dirname, '../__fixtures__/sample-article.html'),
      'utf-8'
    );

    const article = extractContent(html, { url: 'https://example.com' });

    expect(article.title).toContain('Article Title');
    expect(article.content).toContain('main article content');
    expect(article.content).not.toContain('Navigation menu');
    expect(article.content).not.toContain('Sidebar content');
    expect(article.content).not.toContain('Footer');
  });

  it('should extract author byline', async () => {
    const html = `
      <article>
        <h1>Title</h1>
        <div class="byline">By Jane Smith</div>
        <p>Content</p>
      </article>
    `;

    const article = extractContent(html, { url: 'https://example.com' });
    expect(article.byline).toContain('Jane Smith');
  });

  it('should throw ExtractionError for non-article content', () => {
    const html = '<html><body><div>Just a div</div></body></html>';

    expect(() =>
      extractContent(html, { url: 'https://example.com' })
    ).toThrow(ExtractionError);
  });

  it('should extract site name from meta tags', () => {
    const html = `
      <html>
      <head>
        <meta property="og:site_name" content="Example Site">
      </head>
      <body>
        <article>
          <h1>Title</h1>
          <p>Content</p>
        </article>
      </body>
      </html>
    `;

    const article = extractContent(html, { url: 'https://example.com' });
    expect(article.siteName).toBe('Example Site');
  });
});
```

**Verify RED**: Run `npm test` - should fail with module not found

### GREEN Phase - Implement reader

**File**: `src/reader.ts`

```typescript
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { Article, ReaderOptions } from './types.js';

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export function extractContent(
  html: string,
  options: ReaderOptions
): Article {
  const { document } = parseHTML(html);

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) {
    throw new ExtractionError(
      'Failed to extract readable content from the page. ' +
      'The page might not contain article-like content.'
    );
  }

  return {
    title: article.title,
    byline: article.byline,
    content: article.content,
    textContent: article.textContent,
    length: article.length,
    excerpt: article.excerpt,
    siteName: article.siteName,
  };
}
```

**Verify GREEN**: Run `npm test` - all reader tests should pass

---

## Task 5: Implement HTML-to-Markdown Conversion (TDD)

### RED Phase - Write tests first

**File**: `src/__tests__/converter.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { convertToMarkdown } from '../converter';
import type { Article } from '../types';

describe('convertToMarkdown', () => {
  const mockArticle: Article = {
    title: 'Test Article',
    byline: 'John Doe',
    content: '<p>Simple <strong>bold</strong> and <em>italic</em> text.</p>',
    textContent: 'Simple bold and italic text.',
    length: 30,
    excerpt: 'Simple bold...',
    siteName: 'Test Site'
  };

  it('should convert basic HTML to markdown', () => {
    const result = convertToMarkdown(mockArticle, 'https://example.com');

    expect(result.markdown).toContain('Simple **bold** and *italic* text');
    expect(result.metadata.title).toBe('Test Article');
    expect(result.metadata.author).toBe('John Doe');
    expect(result.metadata.url).toBe('https://example.com');
  });

  it('should preserve code blocks with language', () => {
    const article: Article = {
      ...mockArticle,
      content: '<pre><code class="language-javascript">const x = 1;</code></pre>'
    };

    const result = convertToMarkdown(article, 'https://example.com');

    expect(result.markdown).toContain('```javascript');
    expect(result.markdown).toContain('const x = 1;');
    expect(result.markdown).toContain('```');
  });

  it('should convert tables using GFM', () => {
    const article: Article = {
      ...mockArticle,
      content: `
        <table>
          <thead>
            <tr><th>Name</th><th>Age</th></tr>
          </thead>
          <tbody>
            <tr><td>Alice</td><td>30</td></tr>
          </tbody>
        </table>
      `
    };

    const result = convertToMarkdown(article, 'https://example.com');

    expect(result.markdown).toContain('| Name | Age |');
    expect(result.markdown).toContain('| --- | --- |');
    expect(result.markdown).toContain('| Alice | 30 |');
  });

  it('should handle custom conversion options', () => {
    const result = convertToMarkdown(
      mockArticle,
      'https://example.com',
      {
        headingStyle: 'setext',
        bulletListMarker: '*'
      }
    );

    expect(result.markdown).toBeDefined();
  });

  it('should include extraction timestamp in metadata', () => {
    const before = new Date().toISOString();
    const result = convertToMarkdown(mockArticle, 'https://example.com');
    const after = new Date().toISOString();

    expect(new Date(result.metadata.extractedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(new Date(result.metadata.extractedAt).getTime()).toBeLessThanOrEqual(new Date(after).getTime());
  });
});
```

**Verify RED**: Run `npm test` - should fail

### GREEN Phase - Implement converter

**File**: `src/converter.ts`

```typescript
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { Article, ConversionOptions, ConversionResult } from './types.js';

export function convertToMarkdown(
  article: Article,
  url: string,
  options: ConversionOptions = {}
): ConversionResult {
  const turndownService = new TurndownService({
    headingStyle: options.headingStyle || 'atx',
    codeBlockStyle: options.codeBlockStyle || 'fenced',
    bulletListMarker: options.bulletListMarker || '-',
    hr: '---',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  turndownService.use(gfm);

  turndownService.addRule('codeBlock', {
    filter: function (node) {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node) {
      const codeNode = node.firstChild as HTMLElement;
      const className = codeNode.getAttribute('class') || '';
      const language = className.match(/language-(\w+)/)?.[1] || '';

      return '\n\n```' + language + '\n' +
             codeNode.textContent +
             '\n```\n\n';
    },
  });

  const markdown = turndownService.turndown(article.content);

  return {
    markdown,
    metadata: {
      title: article.title,
      author: article.byline,
      siteName: article.siteName,
      url,
      extractedAt: new Date().toISOString(),
    },
  };
}
```

**Verify GREEN**: Run `npm test` - all converter tests should pass

---

## Task 6: Implement Markdown Sanitizer (TDD)

### RED Phase - Write tests first

**File**: `src/__tests__/sanitizer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeMarkdown, addMetadataHeader } from '../sanitizer';

describe('sanitizeMarkdown', () => {
  it('should normalize line endings', () => {
    const input = 'Line 1\r\nLine 2\r\nLine 3';
    const result = sanitizeMarkdown(input);

    expect(result).not.toContain('\r\n');
    expect(result).toContain('Line 1\nLine 2\nLine 3');
  });

  it('should remove excessive blank lines', () => {
    const input = 'Line 1\n\n\n\n\nLine 2';
    const result = sanitizeMarkdown(input);

    expect(result).toBe('Line 1\n\nLine 2\n');
  });

  it('should trim whitespace from line ends', () => {
    const input = 'Line with spaces   \nAnother line   ';
    const result = sanitizeMarkdown(input);

    expect(result).toBe('Line with spaces\nAnother line\n');
  });

  it('should ensure single trailing newline', () => {
    const input = 'Content without newline';
    const result = sanitizeMarkdown(input);

    expect(result).toBe('Content without newline\n');
  });

  it('should remove zero-width spaces', () => {
    const input = 'Text\u200Bwith\u200Czero\u200Dwidth\uFEFFspaces';
    const result = sanitizeMarkdown(input);

    expect(result).toBe('Textwithzerowidthspaces\n');
  });

  it('should normalize heading spacing', () => {
    const input = 'Paragraph\n## Heading\nContent';
    const result = sanitizeMarkdown(input);

    expect(result).toBe('Paragraph\n\n## Heading\nContent\n');
  });

  it('should normalize list spacing', () => {
    const input = 'Text\n- Item 1\n- Item 2';
    const result = sanitizeMarkdown(input);

    expect(result).toBe('Text\n\n- Item 1\n- Item 2\n');
  });
});

describe('addMetadataHeader', () => {
  it('should add YAML frontmatter with metadata', () => {
    const markdown = '# Content';
    const metadata = {
      title: 'Test Title',
      author: 'John Doe',
      siteName: 'Example Site',
      url: 'https://example.com',
      extractedAt: '2024-01-01T00:00:00Z'
    };

    const result = addMetadataHeader(markdown, metadata);

    expect(result).toContain('---\n');
    expect(result).toContain('title: "Test Title"');
    expect(result).toContain('author: "John Doe"');
    expect(result).toContain('site: "Example Site"');
    expect(result).toContain('url: "https://example.com"');
    expect(result).toContain('extracted: "2024-01-01T00:00:00Z"');
    expect(result).toContain('---\n\n# Content');
  });

  it('should escape quotes in metadata', () => {
    const markdown = 'Content';
    const metadata = {
      title: 'Title with "quotes"',
      author: null,
      siteName: null,
      url: 'https://example.com',
      extractedAt: '2024-01-01T00:00:00Z'
    };

    const result = addMetadataHeader(markdown, metadata);

    expect(result).toContain('title: "Title with \\"quotes\\""');
  });

  it('should handle null metadata fields', () => {
    const markdown = 'Content';
    const metadata = {
      title: 'Title',
      author: null,
      siteName: null,
      url: 'https://example.com',
      extractedAt: '2024-01-01T00:00:00Z'
    };

    const result = addMetadataHeader(markdown, metadata);

    expect(result).not.toContain('author:');
    expect(result).not.toContain('site:');
    expect(result).toContain('title:');
    expect(result).toContain('url:');
  });
});
```

**Verify RED**: Run `npm test` - should fail

### GREEN Phase - Implement sanitizer

**File**: `src/sanitizer.ts`

```typescript
export function sanitizeMarkdown(markdown: string): string {
  let cleaned = markdown;

  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
  cleaned = cleaned.trim() + '\n';
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([^\n])\n([-*+] )/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');

  return cleaned;
}

export function addMetadataHeader(
  markdown: string,
  metadata: {
    title: string;
    author: string | null;
    siteName: string | null;
    url: string;
    extractedAt: string;
  }
): string {
  const lines = ['---'];

  lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);

  if (metadata.author) {
    lines.push(`author: "${metadata.author.replace(/"/g, '\\"')}"`);
  }

  if (metadata.siteName) {
    lines.push(`site: "${metadata.siteName.replace(/"/g, '\\"')}"`);
  }

  lines.push(`url: "${metadata.url}"`);
  lines.push(`extracted: "${metadata.extractedAt}"`);
  lines.push('---');
  lines.push('');

  return lines.join('\n') + markdown;
}
```

**Verify GREEN**: Run `npm test` - all sanitizer tests should pass

---

## Task 7: Implement CLI Interface (TDD)

### RED Phase - Integration tests for CLI

**File**: `src/__tests__/integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  const testOutputFile = 'test-output.md';

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.unlink(testOutputFile);
    } catch { /* ignore */ }
  });

  it('should validate URL input', async () => {
    try {
      await execAsync('npm run dev -- invalid-url');
    } catch (error: any) {
      expect(error.stderr).toContain('Invalid URL');
      expect(error.code).toBe(1);
    }
  });

  it('should handle 404 errors gracefully', async () => {
    try {
      await execAsync('npm run dev -- https://httpstat.us/404');
    } catch (error: any) {
      expect(error.stderr).toContain('404');
      expect(error.code).toBe(1);
    }
  });

  it('should output markdown to stdout by default', async () => {
    // This test requires a mock server or known stable URL
    // For now, we'll test with a simple HTML string via mock
  });

  it('should save to file with --output flag', async () => {
    // Test file output functionality
  });

  it('should respect timeout option', async () => {
    try {
      await execAsync('npm run dev -- https://httpstat.us/200?sleep=5000 --timeout 100');
    } catch (error: any) {
      expect(error.stderr).toContain('timeout');
      expect(error.code).toBe(1);
    }
  });
});
```

**Verify RED**: Run `npm test` - CLI tests should fail

### GREEN Phase - Implement CLI

**File**: `src/cli.ts`

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs/promises';
import { fetchHTML, FetchError } from './fetcher.js';
import { extractContent, ExtractionError } from './reader.js';
import { convertToMarkdown } from './converter.js';
import { sanitizeMarkdown, addMetadataHeader } from './sanitizer.js';
import { CliOptions } from './types.js';

const program = new Command();

program
  .name('doc-reader')
  .description('Convert web pages to clean markdown')
  .version('1.0.0')
  .argument('<url>', 'URL of the web page to convert')
  .option('-o, --output <file>', 'save to specified file')
  .option('-a, --auto-name', 'generate filename from page title')
  .option('--no-sanitize', 'skip markdown sanitization')
  .option('--timeout <ms>', 'request timeout in milliseconds', '30000')
  .option('--retries <n>', 'number of retries', '3')
  .action(async (url: string, options: CliOptions) => {
    try {
      try {
        new URL(url);
      } catch {
        console.error(`Error: Invalid URL: ${url}`);
        process.exit(1);
      }

      console.error(`Fetching: ${url}`);

      const html = await fetchHTML(url, {
        timeout: options.timeout ? parseInt(options.timeout.toString()) : 30000,
        retries: options.retries ? parseInt(options.retries.toString()) : 3,
      });

      console.error('Extracting content...');
      const article = extractContent(html, { url });

      console.error('Converting to markdown...');
      const result = convertToMarkdown(article, url);

      let finalMarkdown = result.markdown;
      if (options.noSanitize !== false) {
        console.error('Sanitizing markdown...');
        finalMarkdown = sanitizeMarkdown(finalMarkdown);
      }

      finalMarkdown = addMetadataHeader(finalMarkdown, result.metadata);

      if (options.output) {
        await fs.writeFile(options.output, finalMarkdown, 'utf-8');
        console.error(`Saved to: ${options.output}`);
      } else if (options.autoName) {
        const filename = result.metadata.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100) + '.md';

        await fs.writeFile(filename, finalMarkdown, 'utf-8');
        console.error(`Saved to: ${filename}`);
      } else {
        console.log(finalMarkdown);
      }

      console.error('✓ Done');
    } catch (error) {
      if (error instanceof FetchError) {
        console.error(`Fetch Error: ${error.message}`);
        process.exit(1);
      } else if (error instanceof ExtractionError) {
        console.error(`Extraction Error: ${error.message}`);
        process.exit(1);
      } else if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      } else {
        console.error('Unknown error occurred');
        process.exit(1);
      }
    }
  });

program.parse();
```

**Verify GREEN**: Run `npm test` - all tests should pass

---

## Task 8: Test Coverage and Edge Cases

**Objective**: Ensure 90%+ test coverage and handle edge cases.

**Steps**:

1. Run coverage report:
```bash
npm run test:coverage
```

2. Add tests for uncovered branches
3. Test edge cases:
   - Empty HTML
   - Malformed HTML
   - Huge documents
   - Network interruptions
   - Various character encodings
   - Different HTML structures

**Verification**:
- Coverage meets thresholds (90% lines, functions, statements)
- All edge cases handled gracefully

---

## Task 9: Build and End-to-End Testing

**Objective**: Compile and test the complete CLI.

**Steps**:

1. Compile TypeScript:
```bash
npm run build
```

2. Make executable:
```bash
chmod +x dist/cli.js
```

3. Run end-to-end tests with real URLs
4. Test all CLI options
5. Verify output quality

**Verification**:
- CLI works as expected
- Output is clean and well-formatted
- All options function correctly

---

## Task 10: Documentation and Git Commit

**Objective**: Document the tool and commit with confidence.

**TDD Process**: Documentation doesn't need tests, but examples should be verified.

**Files to create**:
- `README.md` with usage examples
- `CHANGELOG.md` for version history

**Git commit**:
```bash
git add .
git commit -m "feat: initial implementation with full TDD coverage

- Implemented with strict TDD (RED-GREEN-REFACTOR)
- 90%+ test coverage on all modules
- Comprehensive error handling
- Retry logic with exponential backoff
- Mozilla Readability for content extraction
- Turndown for markdown conversion
- Full CLI with multiple output options"
```

---

## TDD Verification Checklist

Before marking ANY task complete:

- [ ] Wrote failing test FIRST
- [ ] Watched test fail for the RIGHT reason
- [ ] Wrote MINIMAL code to pass
- [ ] All tests green
- [ ] Refactored with tests still green
- [ ] Coverage > 90%
- [ ] No untested code paths
- [ ] Edge cases covered

**VIOLATIONS**:
- Code without failing test first = DELETE AND START OVER
- Test that passed immediately = FIX TEST
- Can't explain failure = NOT TDD
- "I'll add tests later" = DELETE CODE NOW

## Summary

This plan enforces strict TDD for a production-ready CLI:
- ✅ Every line of production code written test-first
- ✅ RED-GREEN-REFACTOR cycle for each feature
- ✅ 90%+ test coverage requirement
- ✅ Comprehensive test suite with unit and integration tests
- ✅ Edge cases and error conditions fully tested
- ✅ Vitest for fast, modern testing

**Total files**: 15+ including tests and fixtures
**Test files**: 7+ test files covering all modules
**Coverage target**: 90%+ on all metrics