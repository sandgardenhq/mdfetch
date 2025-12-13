# Tasks 7 & 8: Test Coverage, Edge Cases, and E2E Testing

## Current Status

**Coverage Report:**
- Overall: 90.9% statements, 90% branches, 100% functions
- fetcher.ts: 100% coverage (perfect!)
- readable.ts: 77.77% statements (uncovered lines: 186-192)
- reader.ts: 89.47% statements (uncovered lines: 96, 138)
- types.ts: 0% (type-only file, no runtime code)

**Uncovered Code Analysis:**
1. `readable.ts:186-192` - Error fallback in makeReadable (malformed HTML handling)
2. `reader.ts:96` - "Failed to extract article" error path
3. `reader.ts:138` - Non-Error object fallback in catch block

---

## Task 7: Improve Test Coverage to 90%+ on ALL Files

### Objective
Add tests for uncovered branches and edge cases to achieve 90%+ coverage on all files (except types.ts which has no runtime code).

### Phase 1: Cover Missing Branches in readable.ts (TDD)

**Target**: Lines 186-192 (malformed HTML fallback in makeReadable)

#### RED Phase - Write failing test

**File**: `src/__tests__/readable.test.ts`

Add these test cases:

```typescript
describe('readable', () => {
  describe('makeReadable', () => {
    // ... existing tests ...

    it('should handle severely malformed HTML gracefully', () => {
      // HTML so broken that Readability.parse() throws
      const brokenHTML = '<html><head></head><body><article><<<BROKEN>>>{{{}}</article></body></html>';

      // Should return null instead of throwing
      const result = makeReadable(brokenHTML);
      expect(result).toBeNull();
    });

    it('should handle HTML with invalid DOM structure', () => {
      // HTML that parseHTML can process but Readability cannot
      const invalidHTML = '<invalid><random><tags><here>';

      const result = makeReadable(invalidHTML);
      expect(result).toBeNull();
    });

    it('should handle completely empty string', () => {
      const result = makeReadable('');
      expect(result).toBeNull();
    });
  });
});
```

**Verify RED**: Run tests - should pass (need to investigate if we can make Readability throw)

**Note**: Lines 186-192 are a try-catch fallback. We need to find HTML that makes Readability.parse() throw an exception. If we cannot trigger this in practice, we should:
1. Document why it's uncovered
2. Consider if the fallback is necessary
3. Possibly refactor to remove dead code

---

### Phase 2: Cover Missing Branches in reader.ts (TDD)

**Target**: Line 96 (Failed to extract article error)
**Target**: Line 138 (Non-Error object fallback)

#### RED Phase - Write failing tests

**File**: `src/__tests__/reader.test.ts`

Add these test cases:

```typescript
describe('reader', () => {
  describe('readURL', () => {
    // ... existing tests ...

    it('should throw ReaderError when article extraction returns null', async () => {
      // Mock fetchHTML to succeed
      const mockHTML = '<html><body>No article content here</body></html>';
      vi.mocked(fetchHTML).mockResolvedValue(mockHTML);

      // This HTML should cause makeReadable to return null
      await expect(
        readURL('https://example.com/not-an-article')
      ).rejects.toThrow(ReaderError);

      await expect(
        readURL('https://example.com/not-an-article')
      ).rejects.toThrow('Failed to extract article');
    });

    it('should wrap non-Error objects in ReaderError', async () => {
      // Mock fetchHTML to throw a non-Error object
      vi.mocked(fetchHTML).mockRejectedValue('string error');

      await expect(
        readURL('https://example.com')
      ).rejects.toThrow(ReaderError);

      await expect(
        readURL('https://example.com')
      ).rejects.toThrow('An unknown error occurred');
    });

    it('should handle null/undefined errors gracefully', async () => {
      // Mock fetchHTML to throw null
      vi.mocked(fetchHTML).mockRejectedValue(null);

      await expect(
        readURL('https://example.com')
      ).rejects.toThrow(ReaderError);
    });
  });
});
```

**Verify RED**: Run tests - they should FAIL (tests don't exist yet)

#### GREEN Phase - Tests should already pass

Run tests. If line 96 is still uncovered:
- Need to find HTML that makes `makeReadable()` return `null`
- Readability returns null when it can't find article-like content

If line 138 is still uncovered:
- Need to make fetchHTML or makeReadable throw a non-Error object
- May need to add a test that throws a string or number

---

### Phase 3: Additional Edge Case Tests (TDD)

Add comprehensive edge case tests for robustness:

**File**: `src/__tests__/edge-cases.test.ts` (NEW FILE)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readURL } from '../reader';
import { fetchHTML } from '../fetcher';
import { makeReadable } from '../readable';

vi.mock('../fetcher');
vi.mock('../readable');

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Character Encoding', () => {
    it('should handle UTF-8 content correctly', async () => {
      const html = `
        <html>
        <head><title>Unicode Test</title></head>
        <body>
          <article>
            <h1>Emoji Test 🚀📄✨</h1>
            <p>Chinese: 你好世界</p>
            <p>Arabic: مرحبا بالعالم</p>
            <p>Russian: Привет мир</p>
          </article>
        </body>
        </html>
      `;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Unicode Test 🚀📄✨',
        content: '<h1>Emoji Test 🚀📄✨</h1><p>Chinese: 你好世界</p>',
        textContent: 'Emoji Test 🚀📄✨ Chinese: 你好世界',
        length: 100,
        excerpt: 'Test',
        byline: null,
        siteName: null,
        lang: 'en',
        dir: 'ltr',
        publishedTime: null
      });

      const result = await readURL('https://example.com/unicode');

      expect(result.markdown).toContain('🚀📄✨');
      expect(result.markdown).toContain('你好世界');
    });

    it('should handle HTML entities correctly', async () => {
      const html = `
        <article>
          <p>&lt;script&gt;alert('xss')&lt;/script&gt;</p>
          <p>&amp; &quot; &apos; &copy; &reg;</p>
        </article>
      `;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Entities',
        content: html,
        textContent: '<script>alert(\'xss\')</script> & " \' © ®',
        length: 50,
        excerpt: 'Test',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/entities');
      expect(result.plainText).toBeDefined();
    });
  });

  describe('Large Documents', () => {
    it('should handle very long articles', async () => {
      // Generate HTML with 10,000 paragraphs
      const paragraphs = Array(10000)
        .fill(null)
        .map((_, i) => `<p>Paragraph ${i} with some content</p>`)
        .join('\n');

      const html = `
        <html>
        <body>
          <article>
            <h1>Long Article</h1>
            ${paragraphs}
          </article>
        </body>
        </html>
      `;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Long Article',
        content: paragraphs,
        textContent: 'Long content...',
        length: 100000,
        excerpt: 'Long...',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/long');

      expect(result.markdown).toBeDefined();
      expect(result.length).toBeGreaterThan(50000);
    });

    it('should handle articles with many images', async () => {
      const images = Array(100)
        .fill(null)
        .map((_, i) => `<img src="/image${i}.jpg" alt="Image ${i}">`)
        .join('\n');

      const html = `<article>${images}</article>`;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Images',
        content: images,
        textContent: '',
        length: 10,
        excerpt: '',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/images');
      expect(result.markdown).toBeDefined();
    });
  });

  describe('Malformed HTML', () => {
    it('should handle unclosed tags', async () => {
      const html = '<article><h1>Title<p>Content<div>More';

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Title',
        content: '<h1>Title</h1><p>Content</p><div>More</div>',
        textContent: 'Title Content More',
        length: 20,
        excerpt: 'Title',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/unclosed');
      expect(result).toBeDefined();
    });

    it('should handle completely empty HTML', async () => {
      const html = '';

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue(null);

      await expect(
        readURL('https://example.com/empty')
      ).rejects.toThrow('Failed to extract article');
    });

    it('should handle HTML with no article content', async () => {
      const html = '<html><body><nav>Menu</nav><footer>Footer</footer></body></html>';

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue(null);

      await expect(
        readURL('https://example.com/no-article')
      ).rejects.toThrow('Failed to extract article');
    });
  });

  describe('Complex HTML Structures', () => {
    it('should handle nested blockquotes', async () => {
      const html = `
        <article>
          <blockquote>
            <p>Level 1</p>
            <blockquote>
              <p>Level 2</p>
              <blockquote>
                <p>Level 3</p>
              </blockquote>
            </blockquote>
          </blockquote>
        </article>
      `;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Nested',
        content: html,
        textContent: 'Level 1 Level 2 Level 3',
        length: 30,
        excerpt: 'Nested',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/nested');
      expect(result.markdown).toContain('>');
    });

    it('should handle complex tables', async () => {
      const html = `
        <article>
          <table>
            <thead>
              <tr>
                <th colspan="2">Header</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowspan="2">Cell</td>
                <td>Data</td>
              </tr>
              <tr>
                <td>More</td>
              </tr>
            </tbody>
          </table>
        </article>
      `;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Table',
        content: html,
        textContent: 'Header Cell Data More',
        length: 30,
        excerpt: 'Table',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/table');
      expect(result.markdown).toContain('|');
    });

    it('should handle mixed content types', async () => {
      const html = `
        <article>
          <h1>Title</h1>
          <p>Text with <strong>bold</strong> and <em>italic</em></p>
          <pre><code>const x = 1;</code></pre>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <blockquote>Quote</blockquote>
          <table>
            <tr><td>Cell</td></tr>
          </table>
          <img src="image.jpg" alt="Image">
          <a href="https://example.com">Link</a>
        </article>
      `;

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Mixed',
        content: html,
        textContent: 'Title Text with bold and italic',
        length: 100,
        excerpt: 'Mixed',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/mixed');
      expect(result.markdown).toContain('**bold**');
      expect(result.markdown).toContain('*italic*');
      expect(result.markdown).toContain('```');
      expect(result.markdown).toContain('-');
      expect(result.markdown).toContain('>');
      expect(result.markdown).toContain('|');
    });
  });

  describe('URL Edge Cases', () => {
    it('should handle URLs with query parameters', async () => {
      const html = '<article><h1>Title</h1><p>Content</p></article>';

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Title',
        content: '<h1>Title</h1><p>Content</p>',
        textContent: 'Title Content',
        length: 20,
        excerpt: 'Content',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/article?id=123&ref=twitter');
      expect(result.url).toBe('https://example.com/article?id=123&ref=twitter');
    });

    it('should handle URLs with fragments', async () => {
      const html = '<article><h1>Title</h1><p>Content</p></article>';

      vi.mocked(fetchHTML).mockResolvedValue(html);
      vi.mocked(makeReadable).mockReturnValue({
        title: 'Title',
        content: '<h1>Title</h1><p>Content</p>',
        textContent: 'Title Content',
        length: 20,
        excerpt: 'Content',
        byline: null,
        siteName: null,
        lang: null,
        dir: null,
        publishedTime: null
      });

      const result = await readURL('https://example.com/article#section');
      expect(result.url).toBe('https://example.com/article#section');
    });
  });
});
```

**Verify RED**: Run tests - they should FAIL (file doesn't exist)

**Verify GREEN**: Create the test file and run - all tests should pass

---

## Task 8: Build and End-to-End Testing

### Objective
Test the compiled CLI with real-world URLs to ensure production readiness.

### Phase 1: Build Verification

**Steps**:

1. Clean build:
```bash
rm -rf dist/
npm run build
```

2. Verify build artifacts:
```bash
ls -la dist/
# Should see: cli.js, fetcher.js, readable.js, reader.js, types.js, etc.
```

3. Check shebang:
```bash
head -n 1 dist/cli.js
# Should see: #!/usr/bin/env node
```

4. Make executable:
```bash
chmod +x dist/cli.js
```

5. Verify it runs:
```bash
node dist/cli.js --help
# Should display help
```

---

### Phase 2: End-to-End Test Plan

Test the CLI with real URLs covering different website types:

#### Test Case 1: Simple Blog Post
```bash
node dist/cli.js https://example-blog.com/simple-article -o test-simple.md
```

**Expected**:
- ✅ Fetches successfully
- ✅ Creates test-simple.md
- ✅ File contains markdown with metadata header
- ✅ No errors or warnings

**Verification**:
```bash
cat test-simple.md | head -20
# Check for:
# - Title in header
# - Metadata (URL, author, etc.)
# - Markdown formatting (headers, paragraphs)
```

---

#### Test Case 2: Article with Images
```bash
node dist/cli.js https://example.com/article-with-images -o test-images.md
```

**Expected**:
- ✅ Image URLs are absolute (not relative)
- ✅ Images formatted as markdown: `![alt](url)`

**Verification**:
```bash
grep "!\[" test-images.md
# Should show markdown image syntax with full URLs
```

---

#### Test Case 3: Article with Code Blocks
```bash
node dist/cli.js https://example.com/tech-tutorial -o test-code.md
```

**Expected**:
- ✅ Code blocks use fenced syntax with language
- ✅ Code formatting preserved

**Verification**:
```bash
grep -A 3 '```' test-code.md
# Should show code blocks with language specifier
```

---

#### Test Case 4: Article with Tables
```bash
node dist/cli.js https://example.com/data-article -o test-tables.md
```

**Expected**:
- ✅ Tables converted to GFM format
- ✅ Pipe characters align properly

**Verification**:
```bash
grep '|' test-tables.md
# Should show GFM table syntax
```

---

#### Test Case 5: Output to stdout
```bash
node dist/cli.js https://example.com/article
```

**Expected**:
- ✅ Markdown printed to stdout
- ✅ Progress messages to stderr only
- ✅ Can be piped: `node dist/cli.js URL | less`

---

#### Test Case 6: HTML output format
```bash
node dist/cli.js https://example.com/article --html -o test.html
```

**Expected**:
- ✅ Outputs readable HTML instead of markdown
- ✅ No markdown formatting in output

**Verification**:
```bash
head test.html
# Should see HTML tags, not markdown syntax
```

---

#### Test Case 7: Plain text output
```bash
node dist/cli.js https://example.com/article --text -o test.txt
```

**Expected**:
- ✅ Outputs plain text only
- ✅ No HTML or markdown

---

#### Test Case 8: Custom timeout
```bash
node dist/cli.js https://slow-site.com/article --timeout 60000
```

**Expected**:
- ✅ Waits up to 60 seconds
- ✅ Doesn't timeout prematurely

---

#### Test Case 9: Retry logic (with failing URL)
```bash
node dist/cli.js https://httpstat.us/500 --retries 3
```

**Expected**:
- ✅ Retries 3 times
- ✅ Shows retry messages
- ✅ Eventually fails gracefully with error message

---

#### Test Case 10: Error handling - 404
```bash
node dist/cli.js https://example.com/does-not-exist
```

**Expected**:
- ✅ Exit code 1
- ✅ Clear error message about 404
- ✅ No stack trace (graceful)

---

### Phase 3: npm link Testing

**Steps**:

1. Install globally via npm link:
```bash
npm link
```

2. Test the global command:
```bash
mdfetch --help
mdfetch --version
```

3. Test with a real URL:
```bash
mdfetch https://example.com/article -o test.md
```

4. Unlink when done:
```bash
npm unlink -g mdfetch
```

---

### Phase 4: Test Suite for Real URLs (Optional Integration Tests)

Create **optional** integration tests that run against real URLs:

**File**: `src/__tests__/e2e.test.ts` (NEW FILE - OPTIONAL)

```typescript
import { describe, it, expect } from 'vitest';
import { readURL } from '../reader';

// These tests hit real URLs - skip by default
// Run with: npm test -- e2e.test.ts
describe.skip('End-to-End Tests (Real URLs)', () => {
  it('should fetch and convert a real article', async () => {
    // Use a stable, long-lived URL
    const result = await readURL('https://example.com');

    expect(result.title).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
    expect(result.plainText.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout

  it('should handle Wikipedia articles', async () => {
    const result = await readURL('https://en.wikipedia.org/wiki/Markdown');

    expect(result.title).toContain('Markdown');
    expect(result.markdown).toContain('#');
  }, 30000);
});
```

**Note**: These tests are marked with `describe.skip` because:
- They depend on external services
- They're slow
- They can fail due to network issues
- They're not part of the TDD cycle

Use them for manual verification only.

---

## Success Criteria

### Task 7 Complete When:
- [ ] Coverage report shows 90%+ on all metrics
- [ ] All uncovered lines have tests or documented reasons
- [ ] Edge case tests added for:
  - [ ] Empty/malformed HTML
  - [ ] Large documents
  - [ ] Various character encodings
  - [ ] Complex HTML structures
  - [ ] URL edge cases
- [ ] All tests passing
- [ ] No new warnings or errors

### Task 8 Complete When:
- [ ] Clean build completes without errors
- [ ] CLI runs from dist/ directory
- [ ] All 10 manual test cases pass
- [ ] npm link works and global command available
- [ ] Output quality verified (clean markdown, proper formatting)
- [ ] Error handling verified (404s, timeouts, etc.)
- [ ] All CLI flags work correctly (--html, --text, --output, --timeout, --retries)
- [ ] Can pipe output to other commands

---

## Notes

- **Do NOT commit test output files** (test-*.md, test.html, etc.)
- Add `test-*.md` and `test-*.html` to `.gitignore`
- Focus on coverage of actual error paths, not just line coverage
- Document any lines that cannot be covered with a comment explaining why
- E2E tests with real URLs are OPTIONAL - use for manual verification only

---

## Next Steps After Completion

After Tasks 7 & 8 are complete:
1. Review coverage report one final time
2. Run full test suite: `npm run test:coverage`
3. Build for production: `npm run build`
4. Commit all test improvements
5. Consider Task 10: Final documentation and polish
