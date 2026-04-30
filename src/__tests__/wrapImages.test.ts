import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import http from 'http';
import { AddressInfo } from 'net';
import { readURL } from '../reader.js';

async function serveFixture(html: string): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => new Promise<void>((r) => server.close(() => r()))
      });
    });
  });
}

const BUN_FIXTURE = path.join(process.cwd(), 'test/fixtures/bun-debugger.html');

describe('readURL — wrapImages flag against Bun docs fixture', () => {
  it('without wrapImages, drops most content images (preserves current behavior)', async () => {
    const html = await fs.readFile(BUN_FIXTURE, 'utf-8');
    const { url, close } = await serveFixture(html);
    try {
      const result = await readURL(url);
      const imgCount = (result.markdown.match(/!\[[^\]]*\]\(/g) || []).length;
      expect(imgCount).toBeLessThanOrEqual(1);
    } finally {
      await close();
    }
  }, 30000);

  it('with wrapImages: true, preserves all 7 screenshot images and skips nav/icons', async () => {
    const html = await fs.readFile(BUN_FIXTURE, 'utf-8');
    const { url, close } = await serveFixture(html);
    try {
      const result = await readURL(url, { wrapImages: true });
      // The 7 screenshots span two GitHub-hosted CDNs (github.com/oven-sh/bun/assets
      // and github-production-user-asset-*.s3.amazonaws.com). Match both.
      const screenshotMatches = result.markdown.match(/!\[[^\]]*\]\(https:\/\/(github\.com\/oven-sh\/bun\/assets|github-production-user-asset[^/]+)\/[^)]+\)/g) || [];
      expect(screenshotMatches.length).toBe(7);

      // Negative controls: nav logos (in <header>, classed `nav-logo`) should
      // NOT appear. The TS icon (`code-block-icon`) is not asserted on — it
      // appears in the markdown either way because Readability already keeps
      // it inline next to the code block, and our preprocessor's skip rule
      // (which would prevent us from wrapping it) doesn't change that.
      expect(result.markdown).not.toContain('logo-with-wordmark-dark');
      expect(result.markdown).not.toContain('logo-with-wordmark-light');
    } finally {
      await close();
    }
  }, 30000);

  it('with wrapImages: false explicitly, behaves the same as omitting the flag', async () => {
    const html = await fs.readFile(BUN_FIXTURE, 'utf-8');
    const { url, close } = await serveFixture(html);
    try {
      const result = await readURL(url, { wrapImages: false });
      const imgCount = (result.markdown.match(/!\[[^\]]*\]\(/g) || []).length;
      expect(imgCount).toBeLessThanOrEqual(1);
    } finally {
      await close();
    }
  }, 30000);
});
