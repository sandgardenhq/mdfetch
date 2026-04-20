# Progress Report - mdfetch CLI

## Task 0: Test Infrastructure Setup - COMPLETE
- Started: 2024-12-12 10:45 AM
- Tests: N/A (infrastructure setup)
- Coverage: N/A (no code yet)
- Build: ✅ Successful (TypeScript configured)
- Linting: ✅ Clean (strict TypeScript rules enabled)
- Completed: 2024-12-12 10:50 AM
- Notes:
  - Installed Vitest with coverage thresholds (90%+)
  - Configured TypeScript with strict settings
  - Created test directory structure
  - All dependencies installed successfully

## Task 1: Project Initialization - COMPLETE
- Started: 2024-12-12 10:40 AM
- Tests: N/A (configuration only)
- Coverage: N/A (no code yet)
- Build: ✅ Successful
- Linting: ✅ Clean
- Completed: 2024-12-12 10:50 AM
- Notes:
  - package.json configured with all scripts
  - tsconfig.json with strict settings
  - .gitignore created
  - All npm scripts verified working

## Task 2: Type Definitions (TDD) - COMPLETE
- Started: 2024-12-12 12:58 PM
- Tests: 15 passing, 0 failing
- Coverage: N/A (interfaces have no runtime code)
- Build: ✅ Successful
- Linting: ✅ Clean (TypeScript strict mode)
- Completed: 2024-12-12 1:01 PM
- Notes:
  - Followed strict TDD: RED-GREEN-REFACTOR
  - Wrote failing tests first
  - Verified tests failed for right reason (module not found)
  - Created minimal types to pass all tests
  - All TypeScript interfaces defined with proper types
  - Types cover all domain models needed for the CLI

## Task 3: HTTP Fetcher (TDD) - COMPLETE
- Started: 2024-12-12 3:55 PM
- Tests: 19 passing, 0 failing
- Coverage: Lines: 100%, Functions: 100%, Branches: 100%, Statements: 100%
- Build: ✅ Successful
- Linting: ✅ Clean (TypeScript strict mode)
- Completed: 2024-12-12 3:59 PM
- Notes:
  - Strict TDD: RED-GREEN-REFACTOR cycle followed
  - 19 comprehensive test cases written first
  - Tests covered: timeouts, retries, exponential backoff, error handling
  - 100% code coverage achieved on all metrics
  - Proper error class with status code preservation
  - Exponential backoff retry logic implemented

## Task 4: Reader Module (TDD) - COMPLETE
- Started: 2024-12-12 9:08 PM
- Tests: 14 passing, 0 failing
- Coverage: Statements: 89.47%, Functions: 100%, Branches: 75%, Lines: 89.47%
- Build: ✅ Successful
- Linting: ✅ Clean (TypeScript strict mode)
- Completed: 2024-12-12 9:11 PM
- Notes:
  - Strict TDD: RED-GREEN-REFACTOR cycle followed
  - 14 comprehensive test cases written first
  - Implemented full pipeline: fetch → readable → markdown
  - Integrated Turndown with GFM support for markdown conversion
  - Returns all 3 artifacts: readable HTML, plain text, markdown
  - Created TypeScript declarations for turndown-plugin-gfm
  - All metadata preserved (title, byline, siteName, etc.)
  - Overall project coverage: 90.9% statements, 90% branches

## Task 5: Markdown Sanitizer (TDD) - SKIPPED
- Skipped: Turndown with GFM already provides clean markdown output
- No additional sanitization needed

## Task 6: CLI Interface (TDD) - COMPLETE
- Started: 2024-12-12 9:18 PM
- Tests: 9 passing, 0 failing (89 total across project)
- Coverage: Overall 90.9% statements, 90% branches
- Build: ✅ Successful
- Linting: ✅ Clean (TypeScript strict mode)
- Completed: 2024-12-12 9:19 PM
- Notes:
  - Strict TDD: RED-GREEN-REFACTOR cycle followed
  - 9 integration test cases using actual CLI execution
  - Implemented with commander.js for robust arg parsing
  - Full pipeline working: URL → readable → markdown → output
  - Supports stdout or file output with -o/--output flag
  - Configurable timeout, retries, retry-delay options
  - Formatted metadata header in output
  - Proper error handling and exit codes
  - Manual testing verified: --help, --version working

## Next Tasks (Not Started)
- [ ] Task 7: E2E Testing & Polish
- [ ] Task 8: Documentation & Final Commit

## Dependency Optimization - COMPLETE
- Started: 2024-12-12 11:00 AM
- Completed: 2024-12-12 11:05 AM
- Changes:
  - Replaced jsdom (2.5MB) with linkedom (~60KB) - 40x smaller!
  - Removed unnecessary happy-dom
  - TypeScript types work out of the box with linkedom
- Performance benefits:
  - Faster startup time
  - Lower memory footprint
  - Maintained Readability compatibility

## Task 7: Coverage Improvement for Node 22 - COMPLETE
- Started: 2024-12-13 9:09 AM
- Tests: 95 passing, 0 failing (added 3 new tests)
- Coverage: Statements: 92.04%, Functions: 92.85%, Branches: 93.33%, Lines: 92.94%
- Build: ✅ Successful
- Linting: ✅ Clean (TypeScript strict mode)
- Completed: 2024-12-13 9:12 AM
- Notes:
  - **Identified coverage gaps**: reader.ts:132, reader.ts:174, readable.ts:218-224
  - **Added 3 new test cases following TDD**:
    1. Test for when makeReadable returns null (reader.ts:132)
    2. Test for non-Error objects thrown during processing (reader.ts:174)
    3. Test for HTML with problematic entities (error recovery path)
  - **Coverage improvements**:
    - Statements: 89.77% → 92.04% (↑2.27%) ✅ **MEETS 90% THRESHOLD**
    - Branches: 90% → 93.33% (↑3.33%)
    - Lines: 90.58% → 92.94% (↑2.36%)
  - **All coverage thresholds now met for Node 22** (90%+ on all metrics)
  - All tests passing, build successful, no linter errors
  - Followed TDD: RED-GREEN-REFACTOR cycle for all new tests

## Feature: --always-readable and --all-links (Plan Task 6) - COMPLETE
- Started: 2026-04-17
- Tests: 126 passing, 0 failing (added 3 new allLinks happy-path tests)
- Coverage: Statements: 94.02%, Branches: 91.57%, Functions: 95.23%, Lines: 94.4%
- Build: ✅ Successful
- Linting: ✅ Clean (tsc --noEmit clean)
- Completed: 2026-04-17
- Notes:
  - Strict TDD: RED verified (expected '# T...' to contain 'https://nav.test/home' fails), GREEN after wiring.
  - Threaded `allLinks` through `readURL`: when set, `extractLinks` runs on `htmlWithAbsoluteLinks`
    (post-absolutization, pre-Readability) so nav/footer/sidebar anchors survive.
  - Footnotes appended to `markdown` ONLY — `readableHTML` and `plainText` untouched.
  - Separator is exactly `\n\n---\n\n` between article body and `[^1]:` block.
  - Empty-footnotes guard: when `extractLinks` returns `[]`, `formatAsFootnotes` returns `''`, skip append.
  - Task 7 (Readability-failure path) intentionally NOT implemented in this commit.

## Task 9: Coverage & Edge Cases (Plan Task 9) - COMPLETE
- Started: 2026-04-17
- Tests: 143 passing, 0 failing (added 8 new tests)
- Coverage: Statements: 99.31%, Branches: 93.2%, Functions: 95.45%, Lines: 100%
  - fetcher.ts:  100% lines
  - links.ts:    100% lines (was 96.42%)
  - readable.ts: 100% lines (was 83.33%; catch block 265-271 now exercised)
  - reader.ts:   100% lines / 100% branches (was 94.44% branches; line 187 covered)
- Build: ✅ Successful
- Linting: ✅ Clean (tsc --noEmit clean)
- Completed: 2026-04-17
- Notes:
  - **Bug fix (readable.ts):** in the entity-decode retry catch block, reassigned
    the outer `document` to the cleaned retry DOM before constructing Readability.
    Previously, if the retry returned null and `alwaysReadable` was true, the
    fallback ran against the STALE original DOM. Fix is clearly correct; linkedom's
    textarea doesn't decode entities so the behavioral delta isn't observable in
    this test environment — added a test that exercises the code path and asserts
    it succeeds without throwing (comment in test explains the observability gap).
  - **Tightened M1:** `alwaysReadable does not kick in when Readability already
    returns an article` now asserts on `readability-page-1` (Readability's wrapper
    marker) instead of the ambiguous `<p`, which appeared in both branches.
  - **Strengthened Task-7 failure-path:** the "still throws without allLinks" test
    now asserts the thrown `ReaderError` has `originalError.message === 'Failed to
    make article readable'`, proving the error flowed through the inner-catch
    rethrow path (not a pre-Task-7 short-circuit).
  - **Added branch-coverage tests:**
    - links.ts: `new URL('/relative')` / `'//protocol-relative/'` / `'http://[bad'`
      all hit the try/catch-false branch.
    - reader.ts:187: `allLinks:true` + zero extractable links + successful
      makeReadable hits the `if (footnotes)` false branch (no divider appended).
  - **Combined-flags test:** asserts `alwaysReadable:true` AND `allLinks:true`
    compose — `makeReadable` receives the flag and final markdown ends with a
    footnote definition block.
  - Readability mock extended with a per-call behavior queue (`throwCtor`,
    `nullParse`, `real`) so tests can drive specific constructor/parse paths.

## Feature: --always-readable and --all-links - COMPLETE
- Started: 2026-04-17
- Tests: 143 passing, 0 failing
- Coverage: Statements: 99.31%, Branches: 93.2%, Functions: 95.45%, Lines: 100%
- Build: ✅ Successful (`npm run build` clean)
- Linting: ✅ Clean (`npx tsc --noEmit` clean)
- Completed: 2026-04-17
- Shipped:
  - `--always-readable` CLI flag and `alwaysReadable` API option. Runs Readability
    with `charThreshold: 1` (not 0 — Readability's `options.charThreshold || DEFAULT`
    coerces 0 back to the default), and adds a raw-body fallback that synthesizes an
    `Article` from `<title>` + `document.body` when `parse()` returns `null`.
  - `--all-links` CLI flag and `allLinks` API option. Extracts every qualifying
    `<a href>` from the raw HTML after URL-absolutization and before Readability,
    so nav/footer/sidebar anchors survive. Filters: `http(s)` only; skips
    `mailto:`, `javascript:`, `tel:`, `data:`, `ftp:`, anchor-only (`#...`),
    empty `href`, and image extensions (.jpg/.jpeg/.png/.gif/.webp/.svg/.ico/
    .avif/.bmp, case-insensitive, pathname-only). Dedupes by URL, keeps first-
    occurrence text.
  - Footnotes are formatted as `[^N]: [text](url)` (brackets in link text
    escaped), joined with newlines, and appended to `result.markdown` ONLY
    (never `readableHTML` or `plainText`) with a `\n\n---\n\n` divider.
  - When Readability fails AND `--all-links` has produced at least one link,
    `readURL` returns a minimal `ConversionResult` with title-derived heading
    and the footnote block, rather than throwing. Without extractable links it
    still throws (nothing useful to return).
  - Both flags are independent and composable.
- Caveats / notable:
  - The linkedom `<textarea>.value` entity-decode retry (readable.ts) was also
    fixed this feature: the retry now reassigns `document` to the cleaned DOM
    before running Readability, so the `alwaysReadable` raw-body fallback sees
    the cleaned body rather than the stale original. linkedom's textarea
    doesn't actually decode HTML entities, so the behavioral delta is not
    observable in the test environment — there is a test that exercises the
    code path and asserts it doesn't throw, with a comment documenting the
    observability gap.
  - `--always-readable` on its own (without `--all-links`) is still best-effort:
    a page with no `<body>` content and no links will still throw.
  - No inline reference rewriting — footnotes are a pure append; the article
    body's existing markdown links are left intact.

## Task 10: Code-review fixes - COMPLETE
- Started: 2026-04-17
- Tests: 146 passing, 0 failing (added 1 new extractTitle whitespace-collapse test)
- Coverage: Statements: 99.31%, Branches: 93.33%, Functions: 95.65%, Lines: 100%
- Build: ✅ Successful (`npm run build` clean)
- Linting: ✅ Clean (`npx tsc --noEmit` clean)
- Completed: 2026-04-17
- Notes:
  - **Fix #1 (src/types.ts:40):** corrected the JSDoc on `ReaderOptions.alwaysReadable` from
    `charThreshold: 0` to `charThreshold: 1` (matches implementation; `0` is coerced back to
    the default by Readability's `||` operator, so `1` is the smallest honored value). Also
    appended a note that the option additionally enables the raw-body fallback article.
    Documentation-only change; no behavioral test needed.
  - **Fix #2 (src/links.ts `extractTitle`):** interior whitespace now collapses to single
    spaces (`replace(/\s+/g, ' ').trim()`). Previously `.trim()` alone left interior
    newlines intact, which broke out of the `# ${title}` heading in `reader.ts` failure-path
    markdown and let page-controlled title text inject extra headings / footnote defs.
    Strict TDD: RED test asserted `'Foo\n\nBar'` → `'Foo Bar'` (failed), GREEN after fix.
  - Readability-success path is unaffected (that path uses Readability-normalized
    `article.title`, not `extractTitle`).

## Task: User-Agent CLI Option - COMPLETE
- Started: 2026-04-17
- Tests: 103 passing, 0 failing
- Coverage: Lines: 93.1%, Functions: 92.85%, Branches: 93.44%, Statements: 92.22%
- Build: ✅ Successful
- Linting: ✅ Clean
- Completed: 2026-04-17
- Notes:
  - Strict TDD: RED-GREEN-REFACTOR cycle followed for every change
  - Replaced hardcoded Firefox-impersonating UA with exported
    `DEFAULT_USER_AGENT = mdfetch/<pkg.version> (+https://github.com/sandgardenhq/mdfetch)`
  - Added optional `userAgent?: string` field to `FetchOptions`
  - Threaded `userAgent` through `fetchWithTimeout` and `fetchHTML`
  - Verified `readURL` passes the option through transparently
  - Added `--user-agent <string>` CLI flag (Commander.js)
  - Added CLI integration tests (local HTTP server + spawn) covering:
    default UA when flag absent, flag forwarding, and empty-string fallback
  - Updated README with `--user-agent` flag and default-UA note
  - Fixed plan doc: corrected integration.test.ts → cli.test.ts references

## Current Status
- ✅ Project structure ready
- ✅ All dependencies optimized (using linkedom instead of jsdom)
- ✅ Test infrastructure configured
- ✅ TypeScript configured with strict settings
- ✅ All coverage thresholds met (90%+)
- ✅ 146+ tests passing across all modules
- ✅ Build and linting clean
- ✅ `--always-readable` and `--all-links` feature shipped and documented
- ✅ `--user-agent` flag shipped and documented
