/**
 * HTTP fetching module with retry logic and timeout protection.
 *
 * This module provides robust HTTP fetching capabilities with built-in retry logic,
 * exponential backoff, timeout handling, and content type validation. It's designed
 * to handle unreliable networks and flaky servers gracefully.
 *
 * @module fetcher
 *
 * @example
 * ```typescript
 * import { fetchHTML, FetchError } from 'mdfetch/fetcher';
 *
 * try {
 *   const html = await fetchHTML('https://example.com/article', {
 *     timeout: 60000,
 *     retries: 5,
 *     retryDelay: 2000
 *   });
 *   console.log('Fetched', html.length, 'bytes');
 * } catch (error) {
 *   if (error instanceof FetchError) {
 *     console.error('HTTP Error:', error.statusCode, error.message);
 *   }
 * }
 * ```
 */

import { FetchOptions } from './types.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Custom error class for fetch-related errors.
 * Extends the base Error class with HTTP status code and original error tracking.
 *
 * @example
 * ```typescript
 * throw new FetchError('Request failed', 404);
 * ```
 */
export class FetchError extends Error {
  /**
   * Creates a new FetchError.
   *
   * @param message - Error message describing what went wrong
   * @param statusCode - HTTP status code (if applicable)
   * @param originalError - Original error that caused this error (if any)
   */
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
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

/**
 * Fetches HTML content from a URL with timeout and retry capabilities.
 *
 * Features:
 * - Configurable timeout with automatic cancellation
 * - Exponential backoff retry logic for transient failures
 * - Content-type validation (expects HTML)
 * - Automatic retry on 5xx errors, but not 4xx errors
 * - User-agent header to avoid bot detection
 *
 * @param url - The URL to fetch HTML from
 * @param options - Optional fetch configuration
 * @param options.timeout - Request timeout in milliseconds (default: 30000)
 * @param options.retries - Number of retry attempts (default: 3)
 * @param options.retryDelay - Initial delay between retries in milliseconds (default: 1000)
 *
 * @returns Promise that resolves to the HTML content as a string
 *
 * @throws {FetchError} When the request fails after all retries, times out,
 *                      or receives non-HTML content
 *
 * @example
 * ```typescript
 * // Basic usage
 * const html = await fetchHTML('https://example.com');
 *
 * // With custom timeout and retries
 * const html = await fetchHTML('https://example.com', {
 *   timeout: 60000,
 *   retries: 5,
 *   retryDelay: 2000
 * });
 * ```
 */
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

      // Don't retry on 4xx errors (client errors)
      if (error instanceof FetchError && error.statusCode) {
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }

      // If this was the last attempt, throw
      if (attempt === retries) {
        break;
      }

      // Exponential backoff: retryDelay * 2^attempt
      const delay = retryDelay * Math.pow(2, attempt);
      console.error(
        `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  // Preserve status code if last error was a FetchError
  const statusCode = lastError instanceof FetchError ? lastError.statusCode : undefined;

  throw new FetchError(
    `Failed after ${retries + 1} attempts: ${lastError?.message}`,
    statusCode,
    lastError
  );
}