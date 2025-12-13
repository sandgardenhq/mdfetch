/**
 * Options for fetching HTML content from URLs.
 */
export interface FetchOptions {
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts on failure (default: 3) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

/**
 * Options for reading and converting web pages.
 * Extends FetchOptions to inherit timeout, retries, and retryDelay.
 */
export interface ReaderOptions extends FetchOptions {
  // Inherits timeout, retries, retryDelay from FetchOptions
}

/**
 * Represents an article extracted by Mozilla Readability.
 */
export interface Article {
  /** Article title */
  title: string;
  /** Article author/byline */
  byline: string | null;
  /** Article content as HTML */
  content: string;
  /** Article content as plain text */
  textContent: string;
  /** Estimated reading length in characters */
  length: number;
  /** Article excerpt/summary */
  excerpt: string;
  /** Name of the source website */
  siteName: string | null;
}

/**
 * Options for markdown conversion.
 */
export interface ConversionOptions {
  /** Heading style: 'atx' (#) or 'setext' (underline) */
  headingStyle?: 'atx' | 'setext';
  /** Code block style: 'fenced' (```) or 'indented' (4 spaces) */
  codeBlockStyle?: 'fenced' | 'indented';
  /** Bullet list marker character */
  bulletListMarker?: '-' | '+' | '*';
}

/**
 * CLI-specific options.
 */
export interface CliOptions {
  /** Output file path */
  output?: string;
  /** Automatically generate filename from article title */
  autoName?: boolean;
  /** Skip markdown sanitization */
  noSanitize?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
}

/**
 * Complete result from reading and converting a URL.
 * Contains the original URL, extracted content in multiple formats,
 * and all associated metadata.
 */
export interface ConversionResult {
  /** Original URL that was fetched */
  url: string;
  /** Article title */
  title: string;
  /** Readable HTML extracted by Readability */
  readableHTML: string;
  /** Plain text version of the content */
  plainText: string;
  /** Markdown version of the content */
  markdown: string;
  /** Article excerpt/summary */
  excerpt: string;
  /** Article author/byline */
  byline: string;
  /** Name of the source website */
  siteName: string;
  /** Language code (e.g., 'en') */
  lang: string;
  /** Text direction ('ltr' or 'rtl') */
  dir: string;
  /** Publication timestamp */
  publishedTime: string;
  /** Estimated reading length in characters */
  length: number;
}