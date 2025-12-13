# Branch Protection Setup

This document explains how to configure branch protection rules to enforce CI checks before merging.

## Required Branch Protection Rules

To ensure code quality and prevent broken code from being merged, configure the following branch protection rules for the `main` branch:

### 1. Navigate to Branch Protection Settings

1. Go to your repository on GitHub
2. Click **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule**
4. Enter `main` as the branch name pattern

### 2. Enable Required Status Checks

Check the following options:

#### ✅ Require status checks to pass before merging
- Enable: **Require branches to be up to date before merging**

Add the following required status checks:
- `Run Tests and Coverage (18.x)`
- `Run Tests and Coverage (20.x)`
- `Run Tests and Coverage (22.x)`
- `Type Check`

These checks ensure:
- Tests pass on Node.js 18, 20, and 22
- Test coverage meets 90% threshold (statements, functions, lines) and 85% (branches)
- TypeScript type checking passes
- Project builds successfully

#### ✅ Require a pull request before merging
- Enable: **Require approvals** (set to 1 or more, depending on team size)
- Optional: **Dismiss stale pull request approvals when new commits are pushed**

#### ✅ Do not allow bypassing the above settings
- Enable: **Do not allow bypassing the above settings** (prevents admins from force-merging)

### 3. Additional Recommended Settings

#### Optional but Recommended:
- ✅ **Require linear history** - Prevents merge commits, enforces rebase or squash
- ✅ **Include administrators** - Apply rules to repository admins too

#### Not Recommended:
- ❌ **Require signed commits** - Only if your team uses GPG signing
- ❌ **Require deployments to succeed** - Only if you have deployment workflows

### 4. Save Protection Rules

Click **Create** or **Save changes** at the bottom of the page.

## What Happens When Protection is Enabled

### ✅ Passing Checks
When all checks pass:
- Green checkmarks appear next to each status check
- "Merge pull request" button becomes enabled
- PR can be merged

### ❌ Failing Checks
When any check fails:
- Red X appears next to the failing check
- "Merge pull request" button is disabled (or shows warning)
- PR cannot be merged until fixed
- Common failures:
  - Test failures
  - Coverage below threshold (90% statements/functions/lines, 85% branches)
  - TypeScript errors
  - Build failures

### Example Workflow

1. Developer creates a feature branch: `git checkout -b feature/new-feature`
2. Developer makes changes and pushes: `git push origin feature/new-feature`
3. Developer opens a PR on GitHub
4. GitHub Actions automatically runs:
   - Tests on Node.js 18, 20, 22
   - Coverage report (must be ≥90% for statements/functions/lines, ≥85% for branches)
   - Type checking
   - Build verification
5. If all checks pass → PR can be merged
6. If any check fails → Developer must fix and push again

## Local Development Workflow

Before pushing, developers should run locally:

```bash
# Run type checking
npm run typecheck

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build project
npm run build
```

This ensures changes will pass CI before pushing.

## Coverage Thresholds

The CI enforces these coverage thresholds (configured in `vitest.config.ts`):

- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

If coverage drops below these thresholds, the CI build will fail and block the PR.

## Bypassing Protection (Emergency Only)

In emergencies, repository admins can:
1. Temporarily disable branch protection
2. Merge the PR
3. Re-enable branch protection

**This should be extremely rare and documented in the PR.**

## Testing the Setup

To test that branch protection is working:

1. Create a test branch: `git checkout -b test-branch-protection`
2. Make a change that breaks tests (e.g., modify a test to fail)
3. Push and create a PR
4. Verify that:
   - GitHub Actions runs automatically
   - Tests fail
   - Merge button is disabled
   - Status shows ❌ for failing check

## Troubleshooting

### "Merge button is enabled even though checks failed"
- Ensure "Require status checks to pass before merging" is enabled
- Verify the exact status check names are added to required checks
- Check that "Do not allow bypassing" is enabled

### "Checks never run on PR"
- Verify the workflow file is in `.github/workflows/test.yml`
- Check that the workflow is triggered on `pull_request` events
- Look at Actions tab to see if workflow is disabled

### "Coverage check fails but local coverage is fine"
- Ensure you're running `npm run test:coverage` locally
- Check that vitest.config.ts thresholds match CI thresholds
- Verify Node.js version matches (18, 20, or 22)

## Current Status

✅ GitHub Actions workflow created (`.github/workflows/test.yml`)
⏳ Branch protection rules need to be configured manually on GitHub (see instructions above)

Once branch protection is configured, all PRs to `main` will be blocked until:
- All tests pass on Node.js 18, 20, and 22
- Coverage meets 90%/85% thresholds
- TypeScript type checking passes
- Project builds successfully
