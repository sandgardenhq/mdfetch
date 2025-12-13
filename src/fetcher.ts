import { FetchOptions } from './types.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

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