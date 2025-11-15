# GitHub Actions Workflow Updates Summary

## Overview
Updated GitHub Actions CI/CD workflows to enforce commit message validation and integrate semantic-release for automated versioning and releases.

## Changes Made

### 1. New Workflow: validate-commits.yml
**Location**: `/home/beengud/raibid-labs/obi-mcp/.github/workflows/validate-commits.yml`

**Purpose**: Validates all commit messages in pull requests follow Conventional Commits specification.

**Key Features**:
- Triggers on PR events (opened, synchronize, reopened)
- Uses `wagoid/commitlint-github-action@v6` for validation
- Reads configuration from `.commitlintrc.json`
- Posts helpful comment on PR if validation fails
- Timeout: 5 minutes

**Validation Rules**:
- Enforces conventional commit format: `type(scope): subject`
- Required types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Scope is required (configured in .commitlintrc.json)
- Subject cannot start with uppercase or end with period
- Header max length: 100 characters

---

### 2. Updated Workflow: release.yml
**Location**: `/home/beengud/raibid-labs/obi-mcp/.github/workflows/release.yml`

**Major Changes**:
- **Trigger**: Changed from `push.tags: v*` to `push.branches: main`
- **Removed**: Manual changelog generation scripts
- **Added**: Semantic-release integration for automated versioning

**New Features**:
- Fully automated version bumping based on commit messages
- Automatic CHANGELOG.md generation
- Automatic GitHub release creation
- Automatic npm publishing (if NPM_TOKEN configured)
- Smart release detection (no release if no releasable commits)

**Workflow Structure**:
1. **Validate Job**: Runs all quality checks (lint, typecheck, test, build)
2. **Release Job**:
   - Uses semantic-release to analyze commits
   - Determines next version based on commit types
   - Updates package.json, CHANGELOG.md
   - Creates GitHub release with notes
   - Publishes to npm (if configured)
   - Commits changes back to main with [skip ci]
3. **Notify Job**: Optional notification step for successful releases

**Permissions Required**:
- `contents: write` - Create releases and update files
- `issues: write` - Comment on issues
- `pull-requests: write` - Comment on PRs
- `packages: write` - Publish packages

**Environment Variables**:
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `NPM_TOKEN`: Must be configured in repository secrets for npm publishing

---

### 3. Updated Workflow: ci.yml
**Location**: `/home/beengud/raibid-labs/obi-mcp/.github/workflows/ci.yml`

**Changes**:
- **Added**: New `validate-commits` job that runs on pull requests
- Validates commit messages using commitlint
- Runs before other CI jobs
- Installs commitlint dependencies dynamically
- Validates all commits in PR range

**Job Flow**:
```
validate-commits (PR only)
  └─> quality
       └─> build
test (parallel with build)
coverage (PR or main only)
  └─> ci-success
```

---

### 4. Configuration Files

#### .commitlintrc.json
**Location**: `/home/beengud/raibid-labs/obi-mcp/.commitlintrc.json`

Already exists with proper configuration for:
- Conventional commits validation
- Custom scope enforcement
- Subject case rules
- Header length limits

#### .releaserc.json
**Location**: `/home/beengud/raibid-labs/obi-mcp/.releaserc.json`

Already exists with semantic-release configuration for:
- Branch support: main, beta, alpha
- Commit analysis with conventional commits preset
- Release notes generation
- CHANGELOG.md updates
- npm publishing
- GitHub releases
- Git commits for version updates

---

### 5. Updated: package.json
**Location**: `/home/beengud/raibid-labs/obi-mcp/package.json`

**Changes**:
- Removed manual versioning scripts (release, release:minor, etc.)
- Added semantic-release scripts:
  - `semantic-release`: Run semantic-release
  - `semantic-release:dry`: Test release without publishing

**Dependencies Already Configured**:
- `@commitlint/cli`: ^20.1.0
- `@commitlint/config-conventional`: ^20.0.0
- `semantic-release`: ^25.0.2
- `@semantic-release/changelog`: ^6.0.3
- `@semantic-release/git`: ^10.0.1
- `@semantic-release/github`: ^12.0.2
- `@semantic-release/npm`: ^13.1.2

---

## Release Process Flow

### Before (Manual)
1. Developer manually bumps version in package.json
2. Developer manually updates CHANGELOG.md
3. Developer creates git tag
4. Developer pushes tag
5. GitHub Actions triggers on tag
6. GitHub Actions creates release and publishes

### After (Automated with Semantic Release)
1. Developer commits with conventional commit message
2. Developer creates PR
3. CI validates commit messages
4. PR merged to main
5. **Semantic-release automatically**:
   - Analyzes commits since last release
   - Determines next version (major/minor/patch)
   - Updates package.json and package-lock.json
   - Generates/updates CHANGELOG.md
   - Creates git tag
   - Creates GitHub release with notes
   - Publishes to npm (if configured)
   - Commits changes back to main

---

## Version Bump Rules

Based on conventional commit types:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | **minor** (0.1.0 → 0.2.0) | New features |
| `fix:` | **patch** (0.1.0 → 0.1.1) | Bug fixes |
| `perf:` | **patch** (0.1.0 → 0.1.1) | Performance improvements |
| `revert:` | **patch** (0.1.0 → 0.1.1) | Revert changes |
| `docs:` | **patch** (0.1.0 → 0.1.1) | Documentation |
| `refactor:` | **patch** (0.1.0 → 0.1.1) | Code refactoring |
| `BREAKING CHANGE:` | **major** (0.1.0 → 1.0.0) | Breaking changes |
| `style:` | **no release** | Code formatting |
| `test:` | **no release** | Tests only |
| `build:` | **no release** | Build changes |
| `ci:` | **no release** | CI changes |
| `chore:` | **no release** | Maintenance |

---

## Testing the Setup

### Test Commit Message Validation

```bash
# This should pass
git commit -m "feat(tools): add new deployment tool"

# This should fail (no scope)
git commit -m "feat: add new feature"

# This should fail (uppercase subject)
git commit -m "feat(tools): Add new feature"
```

### Test Semantic Release (Dry Run)

```bash
npm run semantic-release:dry
```

This will:
- Analyze commits
- Determine next version
- Show what would be released
- NOT actually publish or create releases

---

## Required GitHub Repository Settings

### 1. Branch Protection Rules for `main`

Enable the following:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - Required checks: `CI Success`, `Validate Commits`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

### 2. GitHub Secrets

Configure the following secret for npm publishing:
- `NPM_TOKEN`: Your npm authentication token

**To get NPM_TOKEN**:
```bash
npm login
npm token create --read-only=false
```

Then add to: Repository Settings → Secrets and variables → Actions → New repository secret

### 3. GitHub Actions Permissions

Enable:
- Settings → Actions → General → Workflow permissions
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

---

## Breaking Changes from Previous Setup

### For Developers

1. **Commit messages must follow conventional commits**
   - PRs will fail if commits don't follow the format
   - Use `type(scope): subject` format

2. **No more manual versioning**
   - Don't manually edit version in package.json
   - Don't create git tags manually
   - Semantic-release handles all versioning

3. **Releases happen on main branch merge**
   - Every merge to main is analyzed for release
   - Not every merge creates a release (only releasable commits)

### For CI/CD

1. **Release workflow trigger changed**
   - Old: Triggered by pushing tags
   - New: Triggered by pushing to main branch

2. **Changelog generation**
   - Old: Manual script-based generation
   - New: Automatic via semantic-release

3. **Version updates**
   - Old: Manual npm version commands
   - New: Automatic via semantic-release

---

## Troubleshooting

### "No release published" message

**Cause**: No commits with releasable types (feat, fix, etc.) since last release.

**Solution**: Ensure commits use proper conventional commit types.

### Semantic-release fails with authentication error

**Cause**: Missing or invalid NPM_TOKEN or GITHUB_TOKEN.

**Solution**:
- Verify NPM_TOKEN is set in repository secrets
- Ensure GitHub Actions has write permissions

### Commit validation fails

**Cause**: Commit messages don't follow conventional commits.

**Solution**: Amend commits to follow the format:
```bash
git commit --amend -m "feat(scope): proper commit message"
git push --force
```

---

## Files Modified

1. `/home/beengud/raibid-labs/obi-mcp/.github/workflows/validate-commits.yml` - NEW
2. `/home/beengud/raibid-labs/obi-mcp/.github/workflows/release.yml` - UPDATED
3. `/home/beengud/raibid-labs/obi-mcp/.github/workflows/ci.yml` - UPDATED
4. `/home/beengud/raibid-labs/obi-mcp/package.json` - UPDATED

## Files Already Configured

1. `/home/beengud/raibid-labs/obi-mcp/.commitlintrc.json` - Commit message rules
2. `/home/beengud/raibid-labs/obi-mcp/.releaserc.json` - Semantic-release config

---

## Benefits

1. **Consistency**: Enforced commit message format across all contributors
2. **Automation**: No manual version bumping or changelog updates
3. **Reliability**: Automated releases reduce human error
4. **Traceability**: Clear connection between commits and releases
5. **Speed**: Instant releases after merge to main
6. **Documentation**: Auto-generated changelogs with categorized changes
7. **Communication**: Automatic comments on issues/PRs when released

---

## Next Steps

1. Configure `NPM_TOKEN` in GitHub repository secrets (if publishing to npm)
2. Enable branch protection rules on `main` branch
3. Test the workflow with a feature branch and PR
4. Review and adjust commit message validation rules if needed
5. Consider adding pre-commit hooks to validate commits locally

---

## Support

For issues or questions:
- Conventional Commits: https://www.conventionalcommits.org
- Semantic Release: https://semantic-release.gitbook.io
- Commitlint: https://commitlint.js.org
