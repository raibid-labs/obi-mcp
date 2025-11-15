# Release Quick Start

Quick reference guide for releasing OBI MCP Server.

## TL;DR

```bash
# Make sure commits follow conventional format
git commit -m "feat(tools): add new deployment feature"
git commit -m "fix(status): resolve edge case"

# Create release (choose one)
npm run release         # PATCH: 0.1.0 → 0.1.1 (bug fixes)
npm run release:minor   # MINOR: 0.1.0 → 0.2.0 (new features)
npm run release:major   # MAJOR: 0.1.0 → 1.0.0 (breaking changes)
npm run release:alpha   # ALPHA: 0.1.0 → 0.1.1-alpha.0 (testing)

# Or with just
just release            # PATCH release
just release-minor      # MINOR release
just release-major      # MAJOR release
```

That's it! GitHub Actions automates the rest.

## What Happens Automatically

1. **Pre-checks run** (linting, tests, type checking, build)
2. **Version bumps** in package.json
3. **Changelog generated** from conventional commits
4. **Git tag created** (e.g., v0.1.1)
5. **Changes pushed** to GitHub
6. **GitHub Actions triggered:**
   - Runs full test suite
   - Builds the project
   - Creates GitHub release with changelog
   - Publishes to npm (if not prerelease)
   - Creates release summary

## Commit Message Format

For proper versioning and changelog generation, use [conventional commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Quick Reference

| Type | When to Use | Effect | Example |
|------|-------------|--------|---------|
| `feat` | New feature | MINOR bump | `feat(tools): add restart tool` |
| `fix` | Bug fix | PATCH bump | `fix(logs): handle empty files` |
| `docs` | Documentation | PATCH bump | `docs(api): update examples` |
| `perf` | Performance | PATCH bump | `perf(logs): optimize reading` |
| `refactor` | Code cleanup | PATCH bump | `refactor: simplify manager` |
| `test` | Tests | PATCH bump | `test: add E2E tests` |
| `chore` | Maintenance | PATCH bump | `chore(deps): update packages` |
| `feat!` | Breaking change | MAJOR bump | `feat!: change API format` |

### Good Examples

```bash
# Feature
git commit -m "feat(tools): add Docker deployment support"

# Bug fix
git commit -m "fix(status): prevent crash when OBI is not running"

# Breaking change
git commit -m "feat(api)!: change configuration schema

BREAKING CHANGE: Config format has changed. See migration guide."

# Documentation
git commit -m "docs(readme): add troubleshooting guide"

# With body and issue reference
git commit -m "feat(logs): add filtering by log level

Add support for filtering logs by severity level (info, warn, error, debug).
This makes it easier to find relevant log entries.

Closes #42"
```

### Bad Examples

```bash
# ❌ Too vague
git commit -m "fix: bug"
git commit -m "feat: updates"

# ❌ Wrong type
git commit -m "update: add new feature"  # Should be "feat"
git commit -m "bug: fix issue"           # Should be "fix"

# ❌ Missing scope (when it would help)
git commit -m "feat: add feature"        # Better: "feat(tools): ..."
```

## Which Release Command to Use?

### Decision Tree

```
What did you do?
├─ Made breaking changes? ────────────→ npm run release:major
│   - Removed/renamed APIs
│   - Changed function signatures
│   - Changed config format
│
├─ Added new features? ───────────────→ npm run release:minor
│   - New tools/resources/prompts
│   - New optional parameters
│   - New capabilities
│
├─ Fixed bugs or improved docs? ──────→ npm run release
│   - Bug fixes
│   - Performance improvements
│   - Documentation updates
│
└─ Testing experimental features? ────→ npm run release:alpha
    - Experimental work
    - Early feedback needed
```

### Based on Your Commits

Look at your commits since the last release:

```bash
# View recent commits
git log --oneline $(git describe --tags --abbrev=0)..HEAD

# Look for patterns:
# Any "feat!" or "BREAKING CHANGE" → Use release:major
# Any "feat" commits               → Use release:minor
# Only "fix"/"docs"/"perf"         → Use release
```

## Quick Checks

Before releasing, run:

```bash
# All checks in one line
npm run lint && npm run typecheck && npm run test:all && npm run build

# Or use just
just check

# Or simulate full CI
just ci
```

Individual checks:
```bash
npm run lint        # Code style
npm run typecheck   # TypeScript types
npm run test:all    # All tests
npm run build       # Compilation
```

## Checklist

### Before Release

- [ ] All changes committed
- [ ] Working directory clean (`git status`)
- [ ] On `main` branch
- [ ] Commits follow conventional format
- [ ] All tests pass locally
- [ ] Documentation updated

### After Release

- [ ] GitHub Actions completed successfully
- [ ] GitHub release created
- [ ] Package published to npm (if not alpha)
- [ ] Version shows on npm: `npm view obi-mcp-server version`

## Common Scenarios

### Scenario 1: Bug Fix Release

```bash
# You fixed some bugs
git commit -m "fix(status): handle missing PID file"
git commit -m "fix(logs): prevent crash on empty file"

# Release patch version
npm run release
# Creates: 0.1.0 → 0.1.1
```

### Scenario 2: Feature Release

```bash
# You added new features
git commit -m "feat(tools): add Docker deployment tool"
git commit -m "feat(resources): add metrics resource"

# Release minor version
npm run release:minor
# Creates: 0.1.0 → 0.2.0
```

### Scenario 3: Breaking Change Release

```bash
# You made breaking changes
git commit -m "feat(config)!: restructure configuration schema

BREAKING CHANGE: Config format changed. See migration guide."

# Release major version
npm run release:major
# Creates: 0.1.0 → 1.0.0
```

### Scenario 4: Testing New Features

```bash
# You want early feedback
git commit -m "feat(tools): add experimental Kubernetes support"

# Release alpha version (won't publish to npm)
npm run release:alpha
# Creates: 0.1.0 → 0.1.1-alpha.0
```

### Scenario 5: Multiple Changes

```bash
# You have mixed changes
git commit -m "feat(tools): add restart capability"
git commit -m "fix(status): handle edge case"
git commit -m "docs(api): update examples"

# Choose based on most significant change (feat = minor)
npm run release:minor
# Creates: 0.1.0 → 0.2.0

# Changelog will include all changes categorized
```

## First-Time Setup

### Configure npm Token

Only needed once before your first release:

1. **Create npm account** at [npmjs.com](https://www.npmjs.com)

2. **Generate token** at [npm tokens](https://www.npmjs.com/settings/tokens)
   - Click "Generate New Token"
   - Choose "Automation" type
   - Copy the token

3. **Add to GitHub:**
   - Go to: `https://github.com/raibid-labs/obi-mcp/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

4. **Test with alpha release:**
   ```bash
   npm run release:alpha
   # Won't publish to npm, but tests the workflow
   ```

## Troubleshooting

### Release Command Fails

**Check for uncommitted changes:**
```bash
git status
# Commit any outstanding changes
```

**Pre-checks failing:**
```bash
# Run individual checks to see what fails
npm run lint
npm run typecheck
npm run test:all
npm run build
```

### GitHub Actions Fail

**View the logs:**
```
https://github.com/raibid-labs/obi-mcp/actions
```

**Common issues:**
- Tests fail in CI but pass locally (environment differences)
- Build fails (missing dependencies)
- NPM_TOKEN is invalid

**Re-run the workflow:**
- Go to failed workflow
- Click "Re-run jobs"

### npm Publish Fails

**403 Forbidden:**
- NPM_TOKEN is invalid or missing
- Update GitHub secret with new token

**Version already exists:**
```bash
# You tried to publish existing version
# Solution: Bump version again
npm run release
```

### Wrong Version Released

**Released wrong version type:**
```bash
# Oops, did patch instead of minor
# Just release the correct version
npm run release:minor
# npm allows skipping versions
```

**Want to deprecate:**
```bash
npm deprecate obi-mcp-server@0.1.1 "Accidental release - use 0.2.0"
```

## Tips and Tricks

### Preview Version Bump

```bash
# See what version would be created
npm run release:dry
```

### View Current Version

```bash
# Local
node -p "require('./package.json').version"

# Published on npm
npm view obi-mcp-server version

# All published versions
npm view obi-mcp-server versions
```

### Check Commit Format

```bash
# View recent commits
git log --oneline -10

# Should look like:
# feat(tools): add feature
# fix(logs): resolve bug
# docs(api): update docs
```

### Batch Conventional Commits

```bash
# Stage files
git add .

# Use commitizen for interactive commit builder (optional)
npx cz

# Or use editor for multi-line commit
git commit
```

### Release from CI Only

If you prefer, you can let CI handle versioning:

```bash
# Just tag manually
git tag v0.1.1
git push --tags

# GitHub Actions will handle the rest
```

## Version Strategy

### Current Phase: MVP (0.x.x)

- **Bug fixes:** PATCH (0.1.0 → 0.1.1)
- **New features:** MINOR (0.1.0 → 0.2.0)
- **Breaking changes:** MINOR (0.1.0 → 0.2.0)
  - Will become MAJOR after 1.0.0

### After 1.0.0: Stable

- **Bug fixes:** PATCH (1.0.0 → 1.0.1)
- **New features:** MINOR (1.0.0 → 1.1.0)
- **Breaking changes:** MAJOR (1.0.0 → 2.0.0)

## Useful Commands

```bash
# Release commands
npm run release           # PATCH bump
npm run release:minor     # MINOR bump
npm run release:major     # MAJOR bump
npm run release:alpha     # Alpha prerelease
npm run release:beta      # Beta prerelease
npm run release:dry       # Preview only

# Just shortcuts
just release              # PATCH
just release-minor        # MINOR
just release-major        # MAJOR
just release-alpha        # ALPHA
just release-dry          # Preview

# Quality checks
npm run lint              # Linting
npm run typecheck         # Type checking
npm run test:all          # All tests
npm run build             # Build project
just check                # All checks
just ci                   # Simulate CI

# Information
npm view obi-mcp-server version              # Published version
npm view obi-mcp-server versions             # All versions
git describe --tags --abbrev=0               # Latest local tag
git log --oneline $(git describe --tags --abbrev=0)..HEAD  # Commits since last tag
```

## Links

- **Full Release Guide:** [RELEASING.md](./RELEASING.md)
- **Semantic Versioning Guide:** [SEMANTIC_VERSIONING.md](./SEMANTIC_VERSIONING.md)
- **Changelog:** [CHANGELOG.md](../CHANGELOG.md)
- **Release Workflow:** [.github/workflows/release.yml](../.github/workflows/release.yml)

## Need Help?

- **Issues:** [GitHub Issues](https://github.com/raibid-labs/obi-mcp/issues)
- **Discussions:** [GitHub Discussions](https://github.com/raibid-labs/obi-mcp/discussions)
- **Slack:** `#otel-ebpf-instrumentation` on [CNCF Slack](https://slack.cncf.io/)

---

**Remember:** Conventional commits drive everything. Good commit messages = automatic versioning + great changelogs!
