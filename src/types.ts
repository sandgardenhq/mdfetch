export interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ReaderOptions extends FetchOptions {
  // Inherits timeout, retries, retryDelay from FetchOptions
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
  url: string;
  title: string;
  readableHTML: string;
  plainText: string;
  markdown: string;
  excerpt: string;
  byline: string;
  siteName: string;
  lang: string;
  dir: string;
  publishedTime: string;
  length: number;
}