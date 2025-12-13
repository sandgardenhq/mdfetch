import { fetchHTML } from './fetcher.js';
import { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } from './readable.js';
import type { ReaderOptions, ConversionResult } from './types.js';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export class ReaderError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ReaderError';
  }
}

/**
 * Reads a URL and returns readable HTML, plain text, and markdown
 * @param url the URL to read
 * @param options optional fetch options (timeout, retries, retryDelay)
 * @returns ConversionResult with all three formats
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
