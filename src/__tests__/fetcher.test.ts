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

    it('should accept custom timeout option', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: vi.fn().mockResolvedValue('<html></html>')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await fetchHTML('https://example.com', { timeout: 5000 });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    it('should timeout after specified duration', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 100);
        });
      });

      const promise = fetchHTML('https://example.com', {
        timeout: 100,
        retries: 0
      });

      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow(FetchError);
      await expect(promise).rejects.toThrow(/timeout/i);
    });

    it('should use default timeout of 30 seconds', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 30000);
        });
      });

      const promise = fetchHTML('https://example.com', { retries: 0 });

      await vi.advanceTimersByTimeAsync(30000);

      await expect(promise).rejects.toThrow(FetchError);
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

    it('should retry 5xx server errors', async () => {
      let attempts = 0;
      (global.fetch as any).mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers()
          });
        }
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: vi.fn().mockResolvedValue('<html>Success</html>')
        });
      });

      const promise = fetchHTML('https://example.com', {
        retries: 2,
        retryDelay: 100
      });

      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('<html>Success</html>');
      expect(attempts).toBe(2);
    });

    it('should use default retry count of 3', async () => {
      let attempts = 0;
      (global.fetch as any).mockImplementation(() => {
        attempts++;
        return Promise.reject(new Error('Network error'));
      });

      const promise = fetchHTML('https://example.com', {
        retryDelay: 10
      });

      // Advance through all retries
      for (let i = 0; i <= 3; i++) {
        await vi.advanceTimersByTimeAsync(10 * Math.pow(2, i));
      }

      await expect(promise).rejects.toThrow(FetchError);
      expect(attempts).toBe(4); // Initial + 3 retries
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
        fetchHTML('https://example.com', { retries: 0 })
      ).rejects.toThrow(/Expected HTML/);
    });

    it('should accept text/html content type', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: vi.fn().mockResolvedValue('<html></html>')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await fetchHTML('https://example.com');
      expect(result).toBe('<html></html>');
    });

    it('should handle missing content-type header', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('<html></html>')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await fetchHTML('https://example.com');
      expect(result).toBe('<html></html>');
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
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).statusCode).toBe(500);
        expect((error as FetchError).message).toContain('500');
      }
    });

    it('should include original error in FetchError', async () => {
      const originalError = new Error('Network failure');
      (global.fetch as any).mockRejectedValue(originalError);

      try {
        await fetchHTML('https://example.com', { retries: 0 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).originalError).toBe(originalError);
      }
    });

    it('should handle abort errors from timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValue(abortError);

      await expect(
        fetchHTML('https://example.com', { retries: 0 })
      ).rejects.toThrow(FetchError);
    });
  });

  describe('FetchError class', () => {
    it('should create error with message and status code', () => {
      const error = new FetchError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('FetchError');
    });

    it('should create error with original error', () => {
      const original = new Error('Original');
      const error = new FetchError('Wrapped error', undefined, original);

      expect(error.message).toBe('Wrapped error');
      expect(error.originalError).toBe(original);
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML response', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: vi.fn().mockResolvedValue('')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await fetchHTML('https://example.com');
      expect(result).toBe('');
    });

    it('should handle very large HTML response', async () => {
      const largeHTML = '<html>' + 'x'.repeat(1000000) + '</html>';
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: vi.fn().mockResolvedValue(largeHTML)
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await fetchHTML('https://example.com');
      expect(result).toBe(largeHTML);
    });

    it('should log retry attempts to console.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let attempts = 0;
      (global.fetch as any).mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: vi.fn().mockResolvedValue('<html></html>')
        });
      });

      const promise = fetchHTML('https://example.com', {
        retries: 1,
        retryDelay: 100
      });

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 1 failed')
      );

      consoleSpy.mockRestore();
    });
  });
});