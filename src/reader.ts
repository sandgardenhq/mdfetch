import { fetchHTML } from './fetcher.js';
import { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } from './readable.js';
import type { ReaderOptions, ConversionResult } from './types.js';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Custom error class for reader-related errors.
 * Wraps errors that occur during the URL reading and conversion process.
 *
 * @example
 * ```typescript
 * throw new ReaderError('Failed to extract content', originalError);
 * ```
 */
export class ReaderError extends Error {
  /**
   * Creates a new ReaderError.
   *
   * @param message - Error message describing what went wrong
   * @param originalError - Original error that caused this error (if any)
   */
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ReaderError';
  }
}

/**
 * Reads a URL and converts it to readable HTML, plain text, and markdown.
 *
 * This is the main entry point for the doc-reader library. It orchestrates
 * the complete pipeline:
 * 1. Fetches HTML from the URL
 * 2. Makes all image and link paths absolute
 * 3. Extracts readable content using Mozilla Readability
 * 4. Converts to markdown using Turndown with GitHub Flavored Markdown support
 *
 * Features:
 * - Returns content in three formats: HTML, plain text, and markdown
 * - Preserves all article metadata (title, author, published date, etc.)
 * - Supports customizable timeout and retry behavior
 * - Automatic URL resolution for embedded resources
 * - GFM support: tables, code blocks, strikethrough, task lists
 *
 * @param url - The URL of the web page to read and convert
 * @param options - Optional configuration for fetching and processing
 * @param options.timeout - Request timeout in milliseconds (default: 30000)
 * @param options.retries - Number of retry attempts (default: 3)
 * @param options.retryDelay - Delay between retries in milliseconds (default: 1000)
 *
 * @returns Promise resolving to ConversionResult with content in all three formats
 *
 * @throws {ReaderError} When fetching fails, content cannot be extracted,
 *                       or conversion encounters an error
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await readURL('https://example.com/article');
 * console.log(result.markdown);     // Markdown version
 * console.log(result.plainText);    // Plain text version
 * console.log(result.readableHTML); // Clean HTML version
 *
 * // With custom options
 * const result = await readURL('https://example.com/article', {
 *   timeout: 60000,
 *   retries: 5
 * });
 *
 * // Access metadata
 * console.log(result.title);        // Article title
 * console.log(result.byline);       // Author
 * console.log(result.publishedTime);// Publication date
 * ```
 */
export async function readURL(
  url: string,
  options?: ReaderOptions
): Promise<ConversionResult> {
  try {
    // Fetch the HTML
    const html = await fetchHTML(url, options);

    // Make image and link paths absolute
    const htmlWithAbsoluteImages = makeImgPathsAbsolute(url, html);
    const htmlWithAbsoluteLinks = makeLinksAbsolute(url, htmlWithAbsoluteImages);

    // Extract readable content
    const article = makeReadable(htmlWithAbsoluteLinks);

    if (!article) {
      throw new Error('Failed to extract article');
    }

    // Convert to markdown using Turndown with GFM support
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });

    // Add GitHub Flavored Markdown support (tables, strikethrough, etc.)
    // Note: gfm is an array of plugins, we need to apply each one
    turndownService.use(gfm);

    const markdown = turndownService.turndown(article.content);

    return {
      url,
      title: article.title,
      readableHTML: article.content,
      plainText: article.textContent,
      markdown,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName,
      lang: article.lang,
      dir: article.dir,
      publishedTime: article.publishedTime,
      length: article.length
    };
  } catch (error) {
    // Check if it's a readability extraction error
    if (error instanceof Error && error.message.includes('Failed to make article readable')) {
      throw new ReaderError('Failed to extract readable content from URL', error);
    }

    // All other errors are treated as fetch or processing errors
    if (error instanceof Error) {
      throw new ReaderError(`Failed to fetch URL: ${error.message}`, error);
    }

    // Fallback for non-Error objects
    throw new ReaderError('An unknown error occurred', error as Error);
  }
}
