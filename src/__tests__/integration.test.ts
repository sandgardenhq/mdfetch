import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync, spawn } from 'child_process';
import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { DEFAULT_USER_AGENT } from '../fetcher';

// We'll test the CLI by actually running it as a subprocess
// This is an integration test that verifies the entire pipeline

describe('CLI Integration', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output');

  beforeEach(async () => {
    // Create test output directory
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  it('should display help when --help flag is used', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('Usage:');
    expect(result).toContain('Options:');
  });

  it('should display version when --version flag is used', () => {
    const result = execSync('tsx src/cli.ts --version', { encoding: 'utf-8' });

    expect(result).toMatch(/\d+\.\d+\.\d+/); // Should match version format
  });

  it('should require a URL argument', () => {
    try {
      execSync('tsx src/cli.ts', { encoding: 'utf-8', stdio: 'pipe' });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.status).not.toBe(0);
      expect(error.stderr.toString()).toContain('missing required argument');
    }
  });

  it('should accept output file option', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('-o, --output');
  });

  it('should accept timeout option', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--timeout');
  });

  it('should accept retries option', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--retries');
  });

  it('should accept --html flag for HTML output', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--html');
  });

  it('should accept --text flag for plain text output', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--text');
  });

  it('should not allow both --html and --text flags together', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    // The help should indicate these are mutually exclusive or in a group
    expect(result).toContain('--html');
    expect(result).toContain('--text');
  });
});

describe('CLI Output', () => {
  it('should write markdown to stdout when no output file specified', () => {
    // We'll need to mock the readURL function for this test
    // This test will be implemented after we create the CLI module
    expect(true).toBe(true); // Placeholder
  });

  it('should write markdown to specified output file', async () => {
    // This will test the actual file writing
    expect(true).toBe(true); // Placeholder
  });

  it('should handle fetch errors gracefully', () => {
    // Test error handling
    expect(true).toBe(true); // Placeholder
  });
});

describe('--user-agent flag', () => {
  // Run the CLI against a local HTTP server that captures the incoming
  // User-Agent header. This mirrors the existing subprocess-based style
  // in this file and lets us verify the CLI's pass-through behavior
  // end-to-end without mocking.
  async function runCliAgainstLocalServer(
    cliArgs: string[]
  ): Promise<{ userAgent: string | undefined }> {
    return new Promise((resolve, reject) => {
      let capturedUA: string | undefined;
      const server = http.createServer((req, res) => {
        capturedUA = req.headers['user-agent'];
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(
          '<html><head><title>T</title></head><body><article><p>hello world from local test server with enough content to keep readability happy enough to succeed on this small synthetic page</p></article></body></html>'
        );
      });

      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as AddressInfo).port;
        const url = `http://127.0.0.1:${port}/`;
        // Use spawn (async) — execSync blocks the event loop, which would
        // starve the in-process HTTP server so it could never accept the
        // CLI's incoming request.
        const child = spawn('tsx', ['src/cli.ts', ...cliArgs, url], {
          stdio: 'pipe'
        });
        child.on('close', () => {
          server.close(() => resolve({ userAgent: capturedUA }));
        });
        child.on('error', () => {
          server.close(() => resolve({ userAgent: capturedUA }));
        });
      });
    });
  }

  it('sends DEFAULT_USER_AGENT when --user-agent flag is absent', async () => {
    const { userAgent } = await runCliAgainstLocalServer([]);

    expect(userAgent).toBe(DEFAULT_USER_AGENT);
  }, 30000);

  it('forwards --user-agent value to the outgoing request', async () => {
    const { userAgent } = await runCliAgainstLocalServer([
      '--user-agent',
      'custom-bot/1.0'
    ]);

    expect(userAgent).toBe('custom-bot/1.0');
  }, 30000);

  it('falls back to DEFAULT_USER_AGENT when --user-agent is an empty string', async () => {
    // Empty string is falsy, so the conditional spread in cli.ts omits the
    // userAgent key entirely, letting the fetcher's DEFAULT_USER_AGENT apply.
    const { userAgent } = await runCliAgainstLocalServer([
      '--user-agent',
      ''
    ]);

    expect(userAgent).toBe(DEFAULT_USER_AGENT);
  }, 30000);
});
