# Project Rules for Claude - doc-site-reader

## Project Overview
Building a TypeScript CLI tool that fetches web pages, extracts main content using Mozilla Readability, and converts to clean markdown.

## ABSOLUTE RULES - NO EXCEPTIONS

### 1. Test-Driven Development is MANDATORY

**The Iron Law**: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

Every single line of production code MUST follow this cycle:
1. **RED**: Write failing test FIRST
2. **Verify RED**: Run test, watch it fail for the RIGHT reason
3. **GREEN**: Write MINIMAL code to pass the test
4. **Verify GREEN**: Run test, confirm it passes
5. **REFACTOR**: Clean up with tests staying green

### 2. Violations = Delete and Start Over

If ANY of these occur, you MUST delete the code and start over:
- ❌ Wrote production code before test → DELETE CODE, START OVER
- ❌ Test passed immediately → TEST IS WRONG, FIX TEST FIRST
- ❌ Can't explain why test failed → NOT TDD, START OVER
- ❌ "I'll add tests later" → DELETE CODE NOW
- ❌ "Just this once without tests" → NO. DELETE CODE.
- ❌ "It's too simple to test" → NO. TEST FIRST.
- ❌ "Tests after achieve same goal" → NO. DELETE CODE.

### 3. Test Coverage Requirements

- **Minimum 90%** coverage on ALL metrics:
  - Lines: 90%+
  - Functions: 90%+
  - Branches: 85%+
  - Statements: 90%+
- Coverage below threshold = Implementation incomplete
- Untested code = Code that shouldn't exist

### 4. Implementation Order

Follow the plan tasks in EXACT order:
1. Task 0: Test Infrastructure Setup
2. Task 1: Project Initialization
3. Task 2: Type Definitions (TDD)
4. Task 3: HTTP Fetcher (TDD)
5. Task 4: Readability Extraction (TDD)
6. Task 5: Markdown Conversion (TDD)
7. Task 6: Markdown Sanitizer (TDD)
8. Task 7: CLI Interface (TDD)
9. Task 8: Coverage & Edge Cases
10. Task 9: Build & E2E Testing
11. Task 10: Documentation & Commit

### 5. Before Writing ANY Code

Ask yourself:
1. Did I write a failing test for this?
2. Did I run the test and see it fail?
3. Did it fail for the expected reason?

If ANY answer is "no" → STOP. Write the test first.

### 6. Test File Structure

For every production file, there MUST be a corresponding test file:
- `src/fetcher.ts` → `src/__tests__/fetcher.test.ts`
- `src/reader.ts` → `src/__tests__/reader.test.ts`
- `src/converter.ts` → `src/__tests__/converter.test.ts`
- `src/sanitizer.ts` → `src/__tests__/sanitizer.test.ts`
- `src/cli.ts` → `src/__tests__/integration.test.ts`

### 7. Task Completion Requirements

**MANDATORY RULE**: NO TASK IS COMPLETE until:
- ✅ ALL tests pass (100% green)
- ✅ Build succeeds: `npm run build` with ZERO errors
- ✅ NO linter errors or warnings
- ✅ Coverage meets minimum thresholds (90%+)
- ✅ Progress documented in PROGRESS.md

A task with failing tests, build errors, or linter warnings is INCOMPLETE. Period.

### 8. Progress Documentation

**MANDATORY RULE**: YOU MUST REPORT YOUR PROGRESS IN `PROGRESS.md`

After completing EACH task:
1. Create `PROGRESS.md` if it doesn't exist
2. Document:
   - Task completed
   - Tests written/passed
   - Coverage achieved
   - Any issues encountered
   - Timestamp

Format:
```markdown
## Task X: [Name] - [COMPLETE/IN PROGRESS]
- Started: [timestamp]
- Tests: X passing, 0 failing
- Coverage: Lines: X%, Functions: X%, Branches: X%, Statements: X%
- Build: ✅ Successful / ❌ Failed
- Linting: ✅ Clean / ❌ X errors
- Completed: [timestamp]
- Notes: [any relevant notes]
```

### 9. Git Commits

- Only commit code that:
  - Has failing tests written first
  - Passes all tests
  - Builds successfully
  - Has no linter errors
  - Meets coverage requirements
  - Has progress documented
- Commit message MUST mention TDD implementation

## Development Workflow

For EACH feature/function:

```
1. Write test file or add test case
2. Run: npm test
3. See RED (test fails)
4. Understand WHY it fails
5. Write minimal production code
6. Run: npm test
7. See GREEN (test passes)
8. Refactor if needed
9. Run: npm test (stays green)
10. Check coverage: npm run test:coverage
11. Repeat for next feature
```

## Commands You'll Use Constantly

```bash
# Watch mode - keep this running ALWAYS
npm test

# Run once
npm test:run

# Check coverage
npm run test:coverage

# Build - MUST succeed before task is complete
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# UI mode for debugging
npm run test:ui
```

## Red Flags - STOP Immediately

If you catch yourself:
- Opening a .ts file before .test.ts
- Writing function implementation before test
- Thinking "I know this works"
- Copying code from examples without tests
- Skipping test runs
- Ignoring failing tests
- Writing multiple features before testing

**STOP. DELETE. START WITH TEST.**

## The Mindset

- Tests are not optional
- Tests are not added after
- Tests DRIVE the implementation
- If it's not tested, it doesn't exist
- Coverage below 90% = unfinished work

## Accountability Check

Before marking ANY task complete, verify:
1. ✓ Test written first?
2. ✓ Test failed first?
3. ✓ Minimal code to pass?
4. ✓ All tests green?
5. ✓ Coverage maintained (90%+)?
6. ✓ Build succeeds (`npm run build`)?
7. ✓ No linter/TypeScript errors?
8. ✓ Progress documented in PROGRESS.md?

Missing ANY ✓ = Task is NOT complete. Fix it first.

## Final Rule

**When in doubt**: Write a test.
**When not in doubt**: Write a test anyway.
**When it seems too simple**: Especially write a test.

There are NO exceptions to TDD in this project. None.

---

*This document is your contract. Breaking these rules means breaking the project's core quality commitment. The discipline of TDD is what separates professional, reliable code from hopeful guesswork.*