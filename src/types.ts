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