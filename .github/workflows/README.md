# GitHub Actions Workflows

This directory contains the CI/CD workflows for the OBI MCP Server project.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch

**Jobs:**

#### Quality Check (3-5 min)
- Type checking with TypeScript
- Linting with ESLint
- Runs first to catch syntax errors quickly

#### Test Matrix (5-8 min)
- Runs tests on Node.js 18, 20, and 22
- Parallel execution across all versions
- Uploads test results on failure
- Fail-fast disabled to see all failures

#### Build (2-3 min)
- Builds the TypeScript project
- Verifies dist/ output exists
- Uploads build artifacts
- Depends on quality check passing

#### Coverage (5-7 min)
- Generates coverage reports
- Uploads to Codecov
- Only runs on PRs and main branch
- Uploads HTML coverage reports as artifacts

#### CI Success
- Final gate that ensures all jobs passed
- Useful for branch protection rules

**Total Duration:** ~8-10 minutes (jobs run in parallel)

**Optimizations:**
- Concurrency control (cancels old runs on new push)
- NPM cache for faster dependency installation
- Parallel job execution
- Fast feedback from quality checks
- Artifact uploads only on failure

### 2. Test Workflow (`test.yml`)

**Triggers:**
- Pull requests to `main` branch
- Only when source files, tests, or config changes

**Features:**
- Runs full test suite (unit, integration, E2E)
- Generates detailed coverage report
- Posts coverage results as PR comment
- Updates existing comment on re-run
- Path filtering to avoid unnecessary runs

**Duration:** ~10-15 minutes

### 3. Quick Check Workflow (`quick-check.yml`)

**Triggers:**
- Every push to any branch
- Only when source files change

**Purpose:**
- Ultra-fast feedback (<3 minutes)
- Type check + lint in parallel
- Quick test run without coverage
- Helps catch issues before PR

**Duration:** ~2-3 minutes

### 4. Release Workflow (`release.yml`)

**Triggers:**
- Push of version tags (v*)

**Actions:**
- Runs tests
- Builds project
- Publishes to npm
- Creates GitHub release

**Requirements:**
- `NPM_TOKEN` secret configured

## Workflow Status Badges

Add these to your README.md:

```markdown
[![CI](https://github.com/raibid-labs/obi-mcp/workflows/CI/badge.svg)](https://github.com/raibid-labs/obi-mcp/actions/workflows/ci.yml)
[![Tests](https://github.com/raibid-labs/obi-mcp/workflows/Tests/badge.svg)](https://github.com/raibid-labs/obi-mcp/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/raibid-labs/obi-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/raibid-labs/obi-mcp)
```

## Branch Protection Rules

Recommended settings for `main` branch:

1. **Require status checks:**
   - `CI Success`
   - `Test Suite`
   - `Code Quality`

2. **Require pull request reviews:**
   - At least 1 approval

3. **Require linear history:**
   - Enforces clean git history

4. **Require signed commits:**
   - Optional but recommended

## Secrets Required

Set these in repository settings:

- `CODECOV_TOKEN` - For coverage uploads (optional)
- `NPM_TOKEN` - For npm publishing (release only)

## Performance Optimizations

### NPM Cache
All workflows use `cache: 'npm'` in setup-node action to cache dependencies.

### Dependency Installation
- `npm ci --prefer-offline --no-audit` for faster, reproducible installs
- `--prefer-offline` uses cache when possible
- `--no-audit` skips audit checks in CI

### Parallel Execution
- Quality checks run independently
- Test matrix runs all Node versions in parallel
- Build runs after quality but parallel to tests

### Concurrency Control
- Cancels in-progress runs when new commits pushed
- Prevents queue buildup
- Saves Actions minutes

### Path Filtering
- Quick check and test workflows only run when relevant files change
- Reduces unnecessary workflow runs

## Troubleshooting

### Workflow not triggering
- Check branch protection rules
- Verify path filters if workflow has them
- Check concurrency settings

### Tests failing only in CI
- Check Node version (ensure it matches matrix)
- Review environment variables
- Check for timezone/locale issues

### Slow workflow runs
- Review npm cache hit rate
- Check for heavy dependencies
- Consider splitting jobs further

### Coverage upload failing
- Verify CODECOV_TOKEN secret exists
- Check codecov action version
- Review coverage file paths

## Local Testing

While you can't run GitHub Actions locally, you can simulate the steps:

```bash
# Quality checks
npm run typecheck
npm run lint

# Run tests
npm test -- --run

# Build
npm run build

# Coverage
npm test -- --run --coverage
```

## Maintenance

### Updating Actions
Dependabot automatically updates GitHub Actions weekly. Review and merge these PRs promptly.

### Monitoring Performance
- Review workflow run times monthly
- Look for slowdowns
- Optimize slow steps

### Matrix Updates
When dropping/adding Node versions:
1. Update matrix in `ci.yml`
2. Update `engines.node` in package.json
3. Update documentation
