# mdfetch API Documentation

> A fast, reliable TypeScript library and CLI tool to convert web pages into clean, readable markdown.

## Overview

**mdfetch** is a production-ready tool for extracting article content from web pages and converting it to clean markdown format. It combines Mozilla's battle-tested Readability algorithm with Turndown's markdown conversion to deliver consistently high-quality results.

### Key Features

- **Smart Content Extraction** - Uses Mozilla Readability to identify and extract main article content, automatically removing navigation, sidebars, ads, and other clutter
- **Multiple Output Formats** - Returns content in three formats: clean HTML, plain text, and GitHub Flavored Markdown
- **Robust Fetching** - Built-in retry logic with exponential backoff, timeout protection, and comprehensive error handling
- **Absolute URLs** - Automatically converts all relative image and link paths to absolute URLs
- **Rich Metadata** - Preserves article title, author, publication date, site name, excerpt, and more
- **TypeScript First** - Written in TypeScript with complete type definitions for excellent IDE support
- **Production Ready** - 90%+ test coverage with comprehensive edge case handling

## Architecture

The library follows a clean pipeline architecture with four main modules:

```
┌─────────┐      ┌──────────┐      ┌───────────┐      ┌──────────┐
│ Fetcher │  →   │ Readable │  →   │  Reader   │  →   │ Markdown │
└─────────┘      └──────────┘      └───────────┘      └──────────┘
    ↓                 ↓                   ↓                 ↓
 HTTP GET      Readability         Orchestration      Turndown
 + Retries     + Absolute URLs     + Error Handling   + GFM
```

### Module Responsibilities

1. **fetcher** - HTTP fetching with retry logic and timeout protection
2. **readable** - Content extraction using Mozilla Readability and URL normalization
3. **reader** - Main orchestration layer that combines all components
4. **types** - TypeScript interfaces and type definitions
5. **cli** - Command-line interface (not exported for library use)

## Quick Start

### Installation

```bash
npm install mdfetch
```

### Basic Usage

```typescript
import { readURL } from 'mdfetch';

// Fetch and convert a URL
const result = await readURL('https://example.com/article');

// Access the content in different formats
console.log(result.markdown);     // GitHub Flavored Markdown
console.log(result.plainText);    // Plain text
console.log(result.readableHTML); // Clean HTML

// Access metadata
console.log(result.title);        // "Article Title"
console.log(result.byline);       // "Author Name"
console.log(result.excerpt);      // "Article summary..."
console.log(result.publishedTime);// "2024-01-15T10:30:00Z"
```

### With Custom Options

```typescript
import { readURL } from 'mdfetch';

const result = await readURL('https://example.com/article', {
  timeout: 60000,      // 60 second timeout
  retries: 5,          // Retry up to 5 times
  retryDelay: 2000     // 2 second initial delay
});
```

## API Structure

### Core Functions

- **`readURL(url, options?)`** - Main entry point that orchestrates the full pipeline
- **`fetchHTML(url, options?)`** - HTTP fetching with retry logic
- **`makeReadable(html)`** - Extract readable content using Mozilla Readability
- **`makeImgPathsAbsolute(baseURL, html)`** - Convert relative image URLs to absolute
- **`makeLinksAbsolute(baseURL, html)`** - Convert relative link URLs to absolute
- **`convertToAbsoluteURL(baseURL, relativeURL)`** - URL resolution utility

### Types

- **`ConversionResult`** - Complete result with content in all formats plus metadata
- **`ReaderOptions`** - Configuration options for fetching (timeout, retries)
- **`Article`** - Extracted article with content and metadata
- **`FetchOptions`** - HTTP fetching configuration

### Error Classes

- **`ReaderError`** - Wraps errors from the reading/conversion pipeline
- **`FetchError`** - HTTP fetching errors with status codes

## Common Use Cases

### Use Case 1: Save Article as Markdown File

```typescript
import { readURL } from 'mdfetch';
import { writeFile } from 'fs/promises';

const result = await readURL('https://blog.example.com/post');
await writeFile('article.md', result.markdown);
```

### Use Case 2: Extract Plain Text for Analysis

```typescript
import { readURL } from 'mdfetch';

const result = await readURL('https://news.example.com/story');
const wordCount = result.plainText.split(/\s+/).length;
const readingTime = Math.ceil(wordCount / 200); // Minutes at 200 WPM
```

### Use Case 3: Batch Process Multiple URLs

```typescript
import { readURL } from 'mdfetch';

const urls = [
  'https://example.com/article1',
  'https://example.com/article2',
  'https://example.com/article3'
];

const results = await Promise.all(
  urls.map(url => readURL(url))
);

for (const result of results) {
  console.log(`${result.title} (${result.length} chars)`);
}
```

### Use Case 4: Error Handling

```typescript
import { readURL, ReaderError } from 'mdfetch';
import { FetchError } from 'mdfetch/fetcher';

try {
  const result = await readURL('https://example.com/article');
  console.log(result.markdown);
} catch (error) {
  if (error instanceof FetchError) {
    console.error(`HTTP Error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof ReaderError) {
    console.error(`Extraction Error: ${error.message}`);
  } else {
    console.error(`Unknown Error: ${error}`);
  }
}
```

### Use Case 5: Handle Slow/Unreliable Sites

```typescript
import { readURL } from 'mdfetch';

// Increase timeout and retries for slow sites
const result = await readURL('https://slow-site.example.com/article', {
  timeout: 120000,     // 2 minutes
  retries: 10,         // Try 10 times
  retryDelay: 3000     // Wait 3 seconds between retries
});
```

## Output Format

### Markdown Format (Default)

The markdown output includes a metadata header followed by the article content:

```markdown
# Article Title

**By:** Author Name
**Source:** Example Site
**Published:** 2024-01-15T10:30:00Z
**URL:** https://example.com/article

---

Article content begins here with proper markdown formatting...

## Section Heading

Paragraphs, **bold text**, *italic text*, and [links](https://example.com).

- Bullet lists
- Are properly formatted

```javascript
// Code blocks with syntax highlighting
const example = "code";
```

| Tables | Are |
| --- | --- |
| Also | Supported |
```

### ConversionResult Object

```typescript
{
  url: string;              // Original URL
  title: string;            // Article title
  readableHTML: string;     // Clean HTML (no ads/nav/footer)
  plainText: string;        // Plain text version
  markdown: string;         // GitHub Flavored Markdown
  excerpt: string | null;   // Article summary
  byline: string | null;    // Author name
  siteName: string | null;  // Site/publication name
  lang: string | null;      // Content language code
  dir: string | null;       // Text direction (ltr/rtl)
  publishedTime: string | null; // Publication timestamp
  length: number;           // Reading length (chars)
}
```

## Configuration Options

### ReaderOptions

```typescript
interface ReaderOptions {
  timeout?: number;      // Request timeout in ms (default: 30000)
  retries?: number;      // Number of retry attempts (default: 3)
  retryDelay?: number;   // Initial retry delay in ms (default: 1000)
}
```

- **timeout**: Maximum time to wait for the HTTP request before aborting
- **retries**: Number of times to retry failed requests (4xx errors are not retried)
- **retryDelay**: Initial delay between retries; uses exponential backoff (delay × 2^attempt)

## Error Handling

The library uses two custom error classes:

### FetchError

Thrown when HTTP fetching fails:

```typescript
class FetchError extends Error {
  statusCode?: number;      // HTTP status code (404, 500, etc.)
  originalError?: Error;    // Original error that caused the failure
}
```

**Common scenarios:**
- Network errors (DNS failures, connection refused)
- HTTP errors (404 Not Found, 500 Server Error)
- Timeout errors
- Invalid URLs

### ReaderError

Thrown when content extraction or conversion fails:

```typescript
class ReaderError extends Error {
  originalError?: Error;    // Original error that caused the failure
}
```

**Common scenarios:**
- Page contains no article-like content
- HTML is completely malformed
- Content extraction fails

## Browser Compatibility

This library is designed for **Node.js environments only**. It uses:

- Node's `fetch` API (Node 18+)
- `linkedom` for DOM parsing (not browser DOM)
- File system operations (for CLI only)

**Minimum Node version**: 18.0.0

## Dependencies

### Core Dependencies

- **@mozilla/readability** - Content extraction algorithm used by Firefox Reader Mode
- **linkedom** - Lightweight DOM implementation (40x smaller than jsdom)
- **turndown** - HTML to Markdown converter
- **turndown-plugin-gfm** - GitHub Flavored Markdown support (tables, strikethrough, etc.)

### CLI Dependencies

- **commander** - Command-line argument parsing (CLI only)

## TypeScript Support

The library is written in TypeScript and includes complete type definitions:

```typescript
import { readURL, ConversionResult, ReaderOptions, ReaderError } from 'mdfetch';
import { fetchHTML, FetchError, FetchOptions } from 'mdfetch/fetcher';
import { makeReadable, Article } from 'mdfetch/readable';
```

All functions are fully typed with JSDoc comments for excellent IDE autocomplete and inline documentation.

## Limitations

### What mdfetch Does Well

- Extracting article content from blogs, news sites, documentation
- Converting standard HTML to clean markdown
- Handling common web page structures

### What mdfetch Doesn't Handle

- **Paywalled content** - Cannot bypass authentication/paywalls
- **JavaScript-rendered content** - Requires pre-rendered HTML (use headless browser first)
- **Complex web apps** - SPAs with dynamic content may not work
- **Aggressive bot detection** - Some sites block automated requests
- **PDFs or other formats** - HTML only

### Workarounds

For JavaScript-heavy sites:
```typescript
// Use puppeteer or playwright to render the page first
import puppeteer from 'puppeteer';
import { readURL } from 'mdfetch';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://spa-example.com');
const html = await page.content();
await browser.close();

// Now process the rendered HTML
const { parseHTML } = await import('linkedom');
const { makeReadable } = await import('mdfetch/readable');
const article = makeReadable(html);
```
