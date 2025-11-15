# Release Process

This document describes the release process for the OBI MCP Server.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Automated Release Workflow](#automated-release-workflow)
- [Commit Message Format](#commit-message-format)
- [Release Checklist](#release-checklist)
- [First-Time Setup](#first-time-setup)
- [Advanced Topics](#advanced-topics)
- [Troubleshooting](#troubleshooting)

## Overview

The OBI MCP Server uses an **automated release workflow** that:
- Determines version bumps from conventional commits
- Auto-generates changelogs
- Creates GitHub releases
- Publishes to npm automatically

**Key Features:**
- One-command releases (`npm run release`)
- Conventional commits drive versioning
- GitHub Actions handles publishing
- Full traceability and rollback support

## Quick Start

### For Most Releases

```bash
# 1. Ensure all changes are committed with conventional commits
git commit -m "feat(tools): add new deployment option"
git commit -m "fix(status): handle edge case gracefully"

# 2. Run release command
npm run release        # For bug fixes (0.1.0 → 0.1.1)
npm run release:minor  # For new features (0.1.0 → 0.2.0)
npm run release:major  # For breaking changes (0.1.0 → 1.0.0)

# 3. That's it! GitHub Actions handles the rest
```

### What Gets Automated

When you push a version tag, GitHub Actions automatically:

1. **Validates** - Runs full test suite, linting, type checking
2. **Builds** - Compiles TypeScript to JavaScript
3. **Generates Changelog** - Creates release notes from conventional commits
4. **Creates GitHub Release** - Publishes release with changelog
5. **Publishes to npm** - Makes package available (if not prerelease)
6. **Notifies** - Creates release summary

## Automated Release Workflow

### Understanding the Workflow

The release process follows this flow:

```
Developer                    npm Scripts              GitHub Actions
    │                            │                         │
    ├─ Write code               │                         │
    ├─ Commit (conventional)    │                         │
    │                            │                         │
    ├─ npm run release ─────────>│                         │
    │                            │                         │
    │                            ├─ Pre-checks            │
    │                            │  (lint, test, build)   │
    │                            ├─ Bump version          │
    │                            ├─ Generate CHANGELOG    │
    │                            ├─ Git commit & tag      │
    │                            ├─ Push to GitHub ──────>│
    │                            │                         │
    │                            │                         ├─ Validate
    │                            │                         ├─ Build
    │                            │                         ├─ Create Release
    │                            │                         ├─ Publish npm
    │                            │                         └─ Notify
    │                            │                         │
    │<──────────── Release Complete ─────────────────────┘
```

### Step-by-Step Process

#### 1. Make Changes with Conventional Commits

Follow the [conventional commits](https://www.conventionalcommits.org/) format:

```bash
# New feature
git commit -m "feat(tools): add Docker deployment support"

# Bug fix
git commit -m "fix(status): prevent crash when OBI is not running"

# Breaking change
git commit -m "feat(api)!: restructure configuration schema

BREAKING CHANGE: Config structure has changed. See migration guide."
```

**See:** [SEMANTIC_VERSIONING.md](./SEMANTIC_VERSIONING.md) for detailed commit message guidelines.

#### 2. Choose Release Type

Determine which command to run based on your changes:

| Your Changes | Command | Version Change | Example |
|--------------|---------|----------------|---------|
| Bug fixes only | `npm run release` | PATCH bump | 0.1.0 → 0.1.1 |
| New features | `npm run release:minor` | MINOR bump | 0.1.0 → 0.2.0 |
| Breaking changes | `npm run release:major` | MAJOR bump | 0.1.0 → 1.0.0 |
| Experimental | `npm run release:alpha` | Prerelease | 0.1.0 → 0.1.1-alpha.0 |
| Testing | `npm run release:beta` | Prerelease | 0.1.0 → 0.1.1-beta.0 |

**Tip:** Let your commit messages guide you:
- Any `feat!` or `BREAKING CHANGE` → Major release
- Any `feat` commits → Minor release
- Only `fix`, `docs`, `perf` → Patch release

#### 3. Run the Release Command

```bash
npm run release
```

**What happens locally:**
1. **Pre-version checks** (`preversion` script):
   - Runs linter (`npm run lint`)
   - Runs type checking (`npm run typecheck`)
   - Runs all tests (`npm run test:all`)
   - Builds the project (`npm run build`)
   - **Fails if any check fails** - ensures quality

2. **Version bump** (`version` script):
   - Updates `package.json` version
   - Generates/updates `CHANGELOG.md` from git commits
   - Stages CHANGELOG.md for commit

3. **Git operations**:
   - Creates commit: `chore(release): 0.1.1`
   - Creates tag: `v0.1.1`

4. **Push** (`postversion` script):
   - Pushes commits and tags to GitHub
   - Triggers GitHub Actions workflow

#### 4. GitHub Actions Takes Over

The [release workflow](.github/workflows/release.yml) runs automatically:

**Validation Job:**
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Run linter
- Run type checking
- Run tests
- Build project
```

**Release Job:**
```yaml
- Generate changelog from commits
- Categorize changes (features, fixes, docs, etc.)
- Create GitHub Release with changelog
- Upload build artifacts
```

**Publish Job (if not prerelease):**
```yaml
- Build project
- Publish to npm with NPM_TOKEN
- Verify publication
```

**Notify Job:**
```yaml
- Create release summary
- Link to GitHub release
- Show npm publish status
```

#### 5. Verify Release

Check that everything completed successfully:

**GitHub Release:**
```
https://github.com/raibid-labs/obi-mcp/releases/tag/v0.1.1
```

**npm Package:**
```
https://www.npmjs.com/package/obi-mcp-server
```

**GitHub Actions:**
```
https://github.com/raibid-labs/obi-mcp/actions/workflows/release.yml
```

### Release Commands Reference

```bash
# Standard releases
npm run release         # PATCH: 0.1.0 → 0.1.1
npm run release:minor   # MINOR: 0.1.0 → 0.2.0
npm run release:major   # MAJOR: 0.1.0 → 1.0.0

# Prereleases
npm run release:alpha   # Alpha: 0.1.0 → 0.1.1-alpha.0
npm run release:beta    # Beta:  0.1.0 → 0.1.1-beta.0

# Utilities
npm run release:dry     # Preview version bump without committing

# Using just
just release            # PATCH release
just release-minor      # MINOR release
just release-major      # MAJOR release
just release-alpha      # ALPHA prerelease
just release-dry        # Dry run
```

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation.

### Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

### Common Types

| Type | Effect | Description | Example |
|------|--------|-------------|---------|
| `feat` | MINOR bump | New feature | `feat(tools): add restart tool` |
| `fix` | PATCH bump | Bug fix | `fix(logs): handle empty files` |
| `docs` | PATCH bump | Documentation | `docs(api): update examples` |
| `perf` | PATCH bump | Performance | `perf(logs): optimize reading` |
| `refactor` | PATCH bump | Code refactoring | `refactor: simplify manager` |
| `test` | PATCH bump | Tests | `test: add E2E tests` |
| `chore` | PATCH bump | Maintenance | `chore(deps): update packages` |
| `!` suffix | MAJOR bump | Breaking change | `feat!: change API format` |

### Examples

**Feature (MINOR bump):**
```bash
git commit -m "feat(tools): add Kubernetes deployment support"
```

**Bug Fix (PATCH bump):**
```bash
git commit -m "fix(status): handle missing PID file gracefully"
```

**Breaking Change (MAJOR bump):**
```bash
git commit -m "feat(config)!: restructure configuration schema

BREAKING CHANGE: Configuration format has changed.
Migration required - see docs/MIGRATION.md"
```

**Documentation (PATCH bump):**
```bash
git commit -m "docs(readme): add troubleshooting section"
```

**Multiple Changes:**
```bash
git commit -m "feat(tools): enhance obi_get_logs with filtering

Add new filtering options:
- Filter by log level
- Filter by time range
- Filter by regex pattern

Closes #112"
```

**See:** [SEMANTIC_VERSIONING.md](./SEMANTIC_VERSIONING.md) for comprehensive commit message guidelines and examples.

## Release Checklist

Use this checklist before creating a release:

### Pre-Release

- [ ] All changes are committed
- [ ] Working directory is clean (`git status`)
- [ ] On `main` branch
- [ ] Pulled latest changes (`git pull`)
- [ ] All commits follow conventional format
- [ ] Breaking changes are clearly marked with `!` or `BREAKING CHANGE`

### Quality Checks

```bash
# Run all checks at once
npm run lint && npm run typecheck && npm run test:all && npm run build

# Or use just
just check
just ci
```

- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] All tests pass (`npm run test:all`)
- [ ] Build succeeds (`npm run build`)

### Documentation

- [ ] README.md is up to date
- [ ] API documentation reflects changes
- [ ] Examples are working
- [ ] Migration guides for breaking changes (if applicable)

### Decision

- [ ] Determined correct version bump (patch/minor/major)
- [ ] Reviewed commits since last release
- [ ] Confirmed no WIP or temporary commits

### Post-Release Verification

- [ ] GitHub Actions workflow completed successfully
- [ ] GitHub release created with correct changelog
- [ ] Package published to npm (check version)
- [ ] Installation works: `npx obi-mcp-server@latest --version`
- [ ] Updated version shows in npm: `npm view obi-mcp-server version`

## First-Time Setup

### npm Authentication

Before your first release, configure npm publishing:

#### 1. Create npm Account

Sign up at [npmjs.com](https://www.npmjs.com) if you don't have an account.

#### 2. Generate Access Token

1. Go to [npm access tokens](https://www.npmjs.com/settings/tokens)
2. Click **"Generate New Token"**
3. Select **"Automation"** type
4. Copy the token (you won't see it again)

#### 3. Add Token to GitHub Secrets

1. Go to repository settings:
   ```
   https://github.com/raibid-labs/obi-mcp/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Add secret:
   - **Name:** `NPM_TOKEN`
   - **Value:** Your npm token (starts with `npm_`)

4. Click **"Add secret"**

#### 4. Verify Package Configuration

Ensure `package.json` has correct publish settings:

```json
{
  "name": "obi-mcp-server",
  "version": "0.1.0",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

### Test Release Workflow

Before the first real release, test the workflow:

```bash
# Create an alpha release (won't publish to npm)
npm run release:alpha

# Verify GitHub Actions runs successfully
# Check: https://github.com/raibid-labs/obi-mcp/actions

# Clean up test release if needed
git tag -d v0.1.1-alpha.0
git push origin :refs/tags/v0.1.1-alpha.0
```

## Advanced Topics

### Semantic Versioning Strategy

#### Current Phase: MVP (v0.x.x)

We're currently in MVP phase using `0.x.x` versions:

- **Breaking changes** → MINOR bump (0.1.0 → 0.2.0)
- **New features** → MINOR bump (0.1.0 → 0.2.0)
- **Bug fixes** → PATCH bump (0.1.0 → 0.1.1)

**Rationale:** Allows flexibility for API changes before 1.0.0 stability commitment.

#### Post-1.0.0: Stable (v1.x.x+)

After reaching stable 1.0.0:

- **Breaking changes** → MAJOR bump (1.0.0 → 2.0.0)
- **New features** → MINOR bump (1.0.0 → 1.1.0)
- **Bug fixes** → PATCH bump (1.0.0 → 1.0.1)

**Transition plan:** 1.0.0 will be released when:
- API is stable and well-tested
- Core features are complete
- Documentation is comprehensive
- Breaking changes are unlikely

### Prerelease Strategy

#### Alpha Releases

**Purpose:** Early testing of experimental features

```bash
npm run release:alpha
# Creates: 0.1.1-alpha.0, 0.1.1-alpha.1, etc.
```

**When to use:**
- Experimental features
- Breaking changes that need feedback
- Major refactorings
- Early access for contributors

**Note:** Alpha releases are NOT published to npm automatically. To publish:

```bash
npm publish --tag alpha
```

Users install with:
```bash
npm install obi-mcp-server@alpha
```

#### Beta Releases

**Purpose:** Final testing before release

```bash
npm run release:beta
# Creates: 0.1.1-beta.0, 0.1.1-beta.1, etc.
```

**When to use:**
- Feature-complete, needs final testing
- Release candidates
- Pre-production validation

**Note:** Beta releases are NOT published to npm automatically. To publish:

```bash
npm publish --tag beta
```

#### Graduating Prereleases

When a prerelease is ready for general availability:

```bash
# If on 0.2.0-beta.3, create final release
npm run release:minor
# Creates: 0.2.0
```

### Hotfix Process

For critical bugs in production:

#### 1. Create Hotfix Branch

```bash
# Start from the problematic tag
git checkout -b hotfix/v0.1.1 v0.1.0
```

#### 2. Make the Fix

```bash
# Fix the bug
git commit -m "fix(critical): resolve security vulnerability in log handler"
```

#### 3. Release Hotfix

```bash
npm run release
# Creates v0.1.1 from hotfix branch
```

#### 4. Merge Back to Main

```bash
git checkout main
git merge hotfix/v0.1.1
git push origin main
git branch -d hotfix/v0.1.1
```

### Manual Release (Fallback)

If automation fails, release manually:

#### 1. Update Version

```bash
npm version patch  # or minor/major
```

#### 2. Push Changes

```bash
git push --follow-tags
```

#### 3. Create GitHub Release

1. Go to [Releases](https://github.com/raibid-labs/obi-mcp/releases)
2. Click **"Draft a new release"**
3. Select the tag
4. Add release notes
5. Publish

#### 4. Publish to npm

```bash
npm publish
```

### Rollback a Release

If a release has critical issues:

#### Option 1: Publish a Fix (Preferred)

```bash
# Fix the issue
git commit -m "fix: resolve critical bug from v0.1.1"

# Release patch
npm run release
# Creates v0.1.2
```

#### Option 2: Deprecate Version

```bash
npm deprecate obi-mcp-server@0.1.1 "Critical bug - use 0.1.2 instead"
```

#### Option 3: Unpublish (Last Resort)

**Warning:** Only available within 72 hours, breaks user installs.

```bash
npm unpublish obi-mcp-server@0.1.1
```

#### Delete GitHub Release

1. Go to [Releases](https://github.com/raibid-labs/obi-mcp/releases)
2. Find the release
3. Click **"Delete"**

#### Remove Git Tag

```bash
# Delete local tag
git tag -d v0.1.1

# Delete remote tag
git push origin :refs/tags/v0.1.1
```

### Changelog Customization

The changelog is auto-generated from commits. Customize by editing the generation script:

**File:** `scripts/generate-changelog.js`

**Current categories:**
- Features (`feat`)
- Bug Fixes (`fix`)
- Documentation (`docs`)
- Performance (`perf`)
- Other Changes
- Maintenance (`chore`, `ci`, `build`)

### Release Cadence

**Planned schedule:**

| Phase | Version | Frequency | Focus |
|-------|---------|-----------|-------|
| MVP | v0.1.x | As needed | Core tools, stability |
| Phase 1 | v0.2.x - v0.5.x | 2-3 weeks | Additional tools |
| Phase 2 | v0.6.x - v0.9.x | Monthly | Advanced features |
| Stable | v1.0.0 | When ready | API stability |
| Mature | v1.x.x | Quarterly | New features |
| Maintenance | v2.x.x+ | As needed | Breaking changes |

## Troubleshooting

### Pre-version Checks Fail

**Problem:** `npm run release` fails during pre-checks

**Solutions:**

```bash
# Check which step fails
npm run lint        # Linting errors?
npm run typecheck   # Type errors?
npm run test:all    # Test failures?
npm run build       # Build errors?

# Fix the issues, then retry
npm run release
```

### Git Push Fails

**Problem:** Can't push tags to GitHub

**Solutions:**

```bash
# Check remote
git remote -v

# Verify you're on main branch
git branch

# Check for uncommitted changes
git status

# Try manual push
git push --follow-tags
```

### GitHub Actions Workflow Fails

**Problem:** Release workflow fails on GitHub

**Check:**

1. **View workflow logs:**
   ```
   https://github.com/raibid-labs/obi-mcp/actions
   ```

2. **Common issues:**
   - Tests fail in CI but pass locally
   - Build fails due to missing dependencies
   - NPM_TOKEN is invalid or expired

3. **Re-run workflow:**
   - Go to failed workflow
   - Click **"Re-run jobs"**

### npm Publish Fails

**Problem:** Package doesn't publish to npm

**Common causes:**

**403 Forbidden:**
```bash
# NPM_TOKEN is invalid or missing
# Solution: Update GitHub secret with new token
```

**Version already published:**
```bash
# You're trying to publish an existing version
# Solution: Bump version and try again
npm run release
```

**Package name taken:**
```bash
# Name collision
# Solution: Change package name in package.json
```

### Changelog Not Generated

**Problem:** CHANGELOG.md is empty or incorrect

**Check commit messages:**

```bash
# View recent commits
git log --oneline

# Should show conventional format:
# feat(tools): add new feature
# fix(status): resolve bug
```

**Fix:**

```bash
# Ensure commits follow conventional format
git log --format="%s" | grep -E "^(feat|fix|docs|chore|test|refactor|perf|ci|build)"

# If needed, amend commit messages
git rebase -i HEAD~5
```

### Version Mismatch

**Problem:** npm shows old version after release

**Wait a few minutes:**
- npm CDN may take time to update
- Check directly: `npm view obi-mcp-server version`

**Clear npm cache:**
```bash
npm cache clean --force
npm view obi-mcp-server version
```

### Accidentally Released Wrong Version

**Problem:** Released patch instead of minor

**Solution 1: Publish correct version**
```bash
npm run release:minor
# Publishes the version you intended
```

**Solution 2: Deprecate and re-release**
```bash
npm deprecate obi-mcp-server@0.1.1 "Incorrect version - use 0.2.0"
npm run release:minor
```

## Monitoring and Analytics

### GitHub Releases

View all releases:
```
https://github.com/raibid-labs/obi-mcp/releases
```

### npm Package

**Package page:**
```
https://www.npmjs.com/package/obi-mcp-server
```

**Download stats:**
```
https://npm-stat.com/charts.html?package=obi-mcp-server
```

**Weekly downloads:**
```bash
npm info obi-mcp-server
```

### GitHub Actions

**Workflow runs:**
```
https://github.com/raibid-labs/obi-mcp/actions/workflows/release.yml
```

**Badges for README:**
```markdown
[![Release](https://github.com/raibid-labs/obi-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/raibid-labs/obi-mcp/actions/workflows/release.yml)
```

## Additional Resources

- **Semantic Versioning Guide:** [SEMANTIC_VERSIONING.md](./SEMANTIC_VERSIONING.md) - Comprehensive guide to commit messages and versioning
- **Quick Start:** [RELEASE_QUICKSTART.md](./RELEASE_QUICKSTART.md) - Quick reference for common release tasks
- **Changelog:** [CHANGELOG.md](../CHANGELOG.md) - Complete version history
- **GitHub Actions:** [.github/workflows/release.yml](../.github/workflows/release.yml) - Release workflow configuration

## External References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For release-related questions or issues:

- **GitHub Issues:** [Report bugs](https://github.com/raibid-labs/obi-mcp/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/raibid-labs/obi-mcp/discussions)
- **Slack:** `#otel-ebpf-instrumentation` on [CNCF Slack](https://slack.cncf.io/)

---

**Next:** See [SEMANTIC_VERSIONING.md](./SEMANTIC_VERSIONING.md) for detailed commit message guidelines and versioning rules.
