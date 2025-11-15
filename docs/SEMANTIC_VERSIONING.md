# Semantic Versioning Guide

This document explains how the OBI MCP Server uses semantic versioning and conventional commits to manage releases.

## Table of Contents

- [Overview](#overview)
- [Semantic Versioning](#semantic-versioning)
- [Conventional Commits](#conventional-commits)
- [How Version Bumps Are Determined](#how-version-bumps-are-determined)
- [Commit Types and Their Effects](#commit-types-and-their-effects)
- [Writing Good Commit Messages](#writing-good-commit-messages)
- [Examples](#examples)
- [Release Process](#release-process)
- [Best Practices](#best-practices)

## Overview

The OBI MCP Server follows **Semantic Versioning 2.0.0** and uses **Conventional Commits** to automatically generate changelogs and determine version bumps.

**Key Benefits:**
- Automatic version management based on commit messages
- Auto-generated changelogs with categorized changes
- Clear communication of breaking changes
- Predictable upgrade paths for users

## Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/) (SemVer):

```
MAJOR.MINOR.PATCH-PRERELEASE

Example: 1.2.3-beta.1
         │ │ │  └─ Prerelease identifier
         │ │ └──── PATCH version
         │ └────── MINOR version
         └──────── MAJOR version
```

### Version Components

#### MAJOR Version (X.0.0)

**When:** Incompatible API changes

**Increment when you:**
- Remove or rename public APIs
- Change function signatures breaking existing code
- Remove configuration options
- Change default behavior in breaking ways
- Require migration steps for users

**Examples:**
```bash
# Breaking: Remove tool
feat!: remove deprecated obi_legacy_deploy tool

BREAKING CHANGE: The obi_legacy_deploy tool has been removed.
Use obi_deploy_local instead.

# Breaking: Change API signature
feat(tools)!: change obi_get_status to return structured data

BREAKING CHANGE: obi_get_status now returns JSON instead of plain text.
Update your code to parse the new format.
```

#### MINOR Version (0.X.0)

**When:** New features, backward compatible

**Increment when you:**
- Add new tools, resources, or prompts
- Add new optional parameters
- Add new features to existing tools
- Deprecate features (but don't remove)

**Examples:**
```bash
# New tool
feat(tools): add obi_restart tool for process restart

# New feature
feat(status): add memory usage metrics to status output

# New optional parameter
feat(logs): add timestamp filter for log queries
```

#### PATCH Version (0.0.X)

**When:** Bug fixes, backward compatible

**Increment when you:**
- Fix bugs or defects
- Improve performance without API changes
- Update documentation
- Refactor internal code
- Update dependencies

**Examples:**
```bash
# Bug fix
fix(status): handle missing PID file gracefully

# Performance improvement
perf(logs): optimize log file reading for large files

# Documentation
docs(readme): clarify installation steps
```

#### PRERELEASE Versions (0.0.0-alpha.X)

**When:** Testing unreleased features

**Types:**
- **alpha** (`0.2.0-alpha.1`): Early testing, unstable
- **beta** (`0.2.0-beta.1`): Feature complete, final testing
- **rc** (`0.2.0-rc.1`): Release candidate, ready for release

**Examples:**
```bash
# Alpha release
npm run release:alpha
# Creates: 0.1.1-alpha.0

# Beta release
npm run release:beta
# Creates: 0.1.1-beta.0
```

## Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

#### Components

**Type (required):** The kind of change
**Scope (optional):** The area of the codebase affected
**! (optional):** Indicates breaking change
**Description (required):** Brief summary of the change
**Body (optional):** Detailed explanation
**Footer (optional):** Breaking changes, issue references

### Full Example

```bash
feat(tools): add Docker deployment support

Add new obi_deploy_docker tool that enables deploying OBI
in containerized environments. Supports custom Docker images,
volume mounts, and network configurations.

Closes #42
```

## How Version Bumps Are Determined

The version bump is determined by the **highest-impact commit** since the last release:

```
Commit Type           → Version Bump
────────────────────────────────────
Any commit with !     → MAJOR (1.0.0 → 2.0.0)
feat                  → MINOR (1.0.0 → 1.1.0)
fix, perf, docs, etc. → PATCH (1.0.0 → 1.0.1)
```

### Decision Tree

```
Has BREAKING CHANGE?
├─ Yes → MAJOR version bump
└─ No
   └─ Has feat commits?
      ├─ Yes → MINOR version bump
      └─ No
         └─ Has fix/perf/etc commits?
            ├─ Yes → PATCH version bump
            └─ No → No release needed
```

### Multiple Commits Example

If your release includes:
- 1 `feat` commit
- 3 `fix` commits
- 2 `docs` commits

**Result:** MINOR version bump (due to the `feat` commit)

If your release includes:
- 1 `feat!` commit (breaking)
- 2 `feat` commits
- 5 `fix` commits

**Result:** MAJOR version bump (due to breaking change)

## Commit Types and Their Effects

### Types That Affect Versioning

| Type | Version Bump | Appears in Changelog | Use For |
|------|--------------|---------------------|---------|
| `feat` | MINOR | Yes | New features |
| `fix` | PATCH | Yes | Bug fixes |
| `perf` | PATCH | Yes | Performance improvements |
| `!` suffix | MAJOR | Yes | Breaking changes |

### Types That Don't Affect Versioning

| Type | Version Bump | Appears in Changelog | Use For |
|------|--------------|---------------------|---------|
| `docs` | PATCH | Yes | Documentation only |
| `style` | PATCH | No | Code formatting |
| `refactor` | PATCH | Yes | Code restructuring |
| `test` | PATCH | Yes | Test changes |
| `chore` | PATCH | Yes | Maintenance tasks |
| `ci` | PATCH | Yes | CI/CD changes |
| `build` | PATCH | Yes | Build system changes |

### Commit Type Details

#### `feat` - New Features

**Version Impact:** MINOR bump

**Use for:**
- New tools, resources, or prompts
- New configuration options
- New command-line flags
- New capabilities

**Examples:**
```bash
feat(tools): add obi_export_metrics tool
feat(resources): add obi://metrics/summary resource
feat(config): support environment variable configuration
```

#### `fix` - Bug Fixes

**Version Impact:** PATCH bump

**Use for:**
- Fixing defects or errors
- Correcting incorrect behavior
- Resolving crashes or exceptions

**Examples:**
```bash
fix(status): prevent crash when OBI is not running
fix(logs): correctly handle empty log files
fix(deploy): fix race condition in process startup
```

#### `perf` - Performance Improvements

**Version Impact:** PATCH bump

**Use for:**
- Improving speed or efficiency
- Reducing memory usage
- Optimizing algorithms

**Examples:**
```bash
perf(logs): use streaming for large log files
perf(status): cache process metrics for 1 second
perf(config): lazy-load configuration validation
```

#### `docs` - Documentation

**Version Impact:** PATCH bump

**Use for:**
- README updates
- API documentation
- Code comments
- Examples

**Examples:**
```bash
docs(readme): add troubleshooting section
docs(api): document all tool parameters
docs(examples): add Docker deployment example
```

#### `refactor` - Code Refactoring

**Version Impact:** PATCH bump

**Use for:**
- Restructuring code without changing behavior
- Improving code quality
- Removing code duplication

**Examples:**
```bash
refactor(tools): extract common validation logic
refactor(manager): simplify process lifecycle code
refactor: convert callbacks to async/await
```

#### `test` - Tests

**Version Impact:** PATCH bump

**Use for:**
- Adding new tests
- Updating existing tests
- Improving test coverage

**Examples:**
```bash
test(tools): add unit tests for obi_stop
test(integration): add E2E test for full lifecycle
test: increase coverage to 99%
```

#### `chore` - Maintenance

**Version Impact:** PATCH bump

**Use for:**
- Dependency updates
- Configuration changes
- Build script updates

**Examples:**
```bash
chore(deps): update dependencies to latest
chore: update Node.js requirement to 20+
chore(lint): add new ESLint rules
```

#### `ci` - CI/CD Changes

**Version Impact:** PATCH bump

**Use for:**
- GitHub Actions updates
- CI configuration
- Release automation

**Examples:**
```bash
ci(release): add automated changelog generation
ci(test): run tests on pull requests
ci: add code coverage reporting
```

## Writing Good Commit Messages

### The Perfect Commit Message

```bash
<type>(<scope>): <imperative summary>
│      │         │
│      │         └─ Present tense, < 72 chars
│      │
│      └─ Optional: affected component
│
└─ Required: change type

[optional body: explain WHAT and WHY, not HOW]

[optional footer: breaking changes, issues]
```

### Guidelines

#### Subject Line (Required)

**DO:**
- Use imperative mood: "add feature" not "added feature"
- Start with lowercase (after type)
- No period at the end
- Keep under 72 characters
- Be specific and descriptive

**Examples:**
```bash
# Good
feat(tools): add retry logic to deployment tool
fix(logs): handle non-UTF8 characters in log output
docs(api): clarify obi_get_status return format

# Bad
feat: stuff
fix: bug
docs: updates
```

#### Scope (Optional)

Indicates the affected component:

**Common scopes:**
- `tools` - MCP tools
- `resources` - MCP resources
- `prompts` - MCP prompts
- `config` - Configuration handling
- `manager` - OBI manager
- `server` - MCP server
- `tests` - Test infrastructure
- `docs` - Documentation
- `deps` - Dependencies

**Examples:**
```bash
feat(tools): add new deployment option
fix(resources): correct status resource MIME type
refactor(manager): simplify lifecycle management
```

#### Body (Optional but Recommended)

**When to include:**
- Complex changes needing explanation
- Non-obvious implementation decisions
- Context for why the change was needed

**Guidelines:**
- Wrap at 72 characters
- Separate from subject with blank line
- Explain WHAT and WHY, not HOW
- Use multiple paragraphs if needed

**Example:**
```bash
feat(tools): add configuration validation tool

Add obi_validate_config tool to check configuration files
for errors before deployment. This helps users catch issues
early and provides detailed error messages.

The validator checks:
- YAML syntax correctness
- Required fields presence
- Value types and ranges
- OTLP endpoint reachability
```

#### Footer (Optional)

**Use for:**
- Breaking changes (required for breaking changes)
- Issue references
- Co-authors
- Reviewers

**Breaking Change Format:**
```bash
feat(api)!: change status response format

BREAKING CHANGE: Status response is now structured JSON instead
of plain text. Update clients to parse the new format:

Before: "Status: running\nPID: 1234"
After: {"status": "running", "pid": 1234}

Migration: Update status parsing to use JSON.parse()
```

**Issue References:**
```bash
fix(deploy): prevent duplicate process spawning

Fixes #123
Closes #45, #67
Related to #89
```

## Examples

### Feature Addition (MINOR bump)

```bash
feat(tools): add Kubernetes deployment support

Add obi_deploy_k8s tool for deploying OBI to Kubernetes clusters.
Supports custom namespaces, resource limits, and service accounts.

Features:
- Automatic YAML generation
- ConfigMap for OBI config
- DaemonSet deployment
- Prometheus metrics endpoint

Closes #78
```

### Bug Fix (PATCH bump)

```bash
fix(status): handle gracefully when OBI process is not running

Previously, obi_get_status would throw an error when OBI was not
running. Now it returns a proper "stopped" status instead.

Fixes #92
```

### Breaking Change (MAJOR bump)

```bash
feat(config)!: restructure configuration schema

BREAKING CHANGE: Configuration schema has been reorganized for
better clarity and consistency.

Migration required:
- network.enabled → network.enable
- export.otlp_endpoint → export.otlp.endpoint
- export.otlp_protocol → export.otlp.protocol

See migration guide: docs/MIGRATION_v2.md

Closes #156
```

### Documentation Update (PATCH bump)

```bash
docs(readme): add troubleshooting guide

Add common issues and solutions section covering:
- Permission errors with eBPF
- OBI binary not found
- Configuration validation failures
- OTLP connection issues
```

### Performance Improvement (PATCH bump)

```bash
perf(logs): implement streaming for large log files

Replace fs.readFile with fs.createReadStream for log files
larger than 1MB. Reduces memory usage by 90% for large logs.

Benchmark results:
- 10MB log: 850ms → 120ms
- Memory: 180MB → 18MB
```

### Refactoring (PATCH bump)

```bash
refactor(manager): extract process monitoring to separate class

Move process monitoring logic from ObiManager to new ProcessMonitor
class. Improves testability and separation of concerns.

No functional changes.
```

### Multiple Changes

```bash
feat(tools): enhance obi_get_logs with filtering options

Add new filtering capabilities to obi_get_logs:
- Filter by log level (info, warn, error, debug)
- Filter by time range
- Filter by regex pattern
- Combine multiple filters

Also includes:
- Performance optimization for large files
- Better error handling for corrupted logs
- Progress indicator for long operations

Closes #112, #134
```

## Release Process

### Automated Workflow

The release process is automated through npm scripts and GitHub Actions:

```bash
# 1. Make changes with conventional commits
git commit -m "feat(tools): add new feature"

# 2. Run release command
npm run release        # PATCH: 0.1.0 → 0.1.1
npm run release:minor  # MINOR: 0.1.0 → 0.2.0
npm run release:major  # MAJOR: 0.1.0 → 1.0.0

# 3. Automated steps:
#    - Runs pre-checks (lint, test, build)
#    - Bumps version in package.json
#    - Generates/updates CHANGELOG.md
#    - Creates git commit and tag
#    - Pushes to GitHub
#    - GitHub Actions creates release
#    - Publishes to npm (if not prerelease)
```

### What Gets Generated

**CHANGELOG.md sections:**
```markdown
## [1.2.0] - 2025-11-15

### Features
- feat(tools): add Docker deployment support (a1b2c3d)
- feat(resources): add metrics resource (d4e5f6g)

### Bug Fixes
- fix(status): handle missing PID file (g7h8i9j)

### Documentation
- docs(api): update tool examples (j0k1l2m)

### Performance
- perf(logs): optimize file reading (m3n4o5p)
```

### Version Selection Guide

```
What did you do?              → Run this command
──────────────────────────────────────────────────
Fixed bugs only               → npm run release
Added backward-compatible     → npm run release:minor
  new features
Made breaking changes         → npm run release:major
Testing unreleased features   → npm run release:alpha
```

## Best Practices

### Commit Frequency

**DO:**
- Make atomic commits (one logical change per commit)
- Commit working code that passes tests
- Write commit messages immediately while context is fresh

**DON'T:**
- Make massive commits with many unrelated changes
- Commit broken or untested code
- Use vague messages like "fix stuff" or "updates"

### Commit Granularity

```bash
# Good: Atomic commits
feat(tools): add obi_restart tool
test(tools): add tests for obi_restart
docs(api): document obi_restart tool

# Bad: Everything in one commit
feat(tools): add restart tool with tests and docs
```

### When to Use Breaking Changes

**Breaking changes should be:**
- Rare and well-justified
- Clearly documented
- Include migration guide
- Ideally batched together in major releases

**Consider alternatives:**
- Deprecation period before removal
- Feature flags for new behavior
- Backward-compatible defaults

### Changelog Hygiene

**Good changelog entries are:**
- User-focused (describe impact, not implementation)
- Specific (include affected components)
- Helpful (link to docs, issues, or PRs)

**Example:**
```bash
# Good
feat(tools): add Docker deployment support

Deploy OBI to Docker containers with the new obi_deploy_docker tool.
Supports custom images, volumes, and networks.

See: docs/DOCKER.md

# Less helpful
feat: docker stuff
```

### Pre-Release Testing

Before creating a release:

```bash
# Run full quality checks
npm run lint
npm run typecheck
npm run test:all
npm run build

# Or use just command
just check
just ci
```

### Version Strategy by Phase

**Pre-1.0 (MVP Phase):** Currently in this phase
- Use 0.x.x versions
- Breaking changes bump MINOR (0.1.0 → 0.2.0)
- New features bump MINOR or PATCH
- Be more flexible with breaking changes

**Post-1.0 (Stable):** After API is stable
- Use 1.x.x+ versions
- Breaking changes bump MAJOR (1.0.0 → 2.0.0)
- Be very conservative with breaking changes
- Prefer deprecation over removal

## Common Mistakes and How to Avoid Them

### Mistake 1: Wrong Commit Type

```bash
# Wrong: Using fix for new feature
fix(tools): add Docker deployment support

# Right: Using feat
feat(tools): add Docker deployment support
```

### Mistake 2: Missing Breaking Change Indicator

```bash
# Wrong: Breaking change without ! or BREAKING CHANGE
feat(api): change status response format

# Right: Clearly marked breaking change
feat(api)!: change status response format

BREAKING CHANGE: Response is now JSON instead of text
```

### Mistake 3: Vague Descriptions

```bash
# Wrong
fix: bug fix

# Right
fix(status): prevent crash when PID file is missing
```

### Mistake 4: Mixing Unrelated Changes

```bash
# Wrong: Multiple unrelated changes
feat: add Docker support and fix status bug and update docs

# Right: Separate commits
feat(tools): add Docker deployment support
fix(status): prevent crash when PID file is missing
docs(readme): add Docker deployment guide
```

## Tools and Resources

### Commit Message Helpers

**Commitizen:** Interactive commit message builder
```bash
npm install -g commitizen
git cz  # Instead of git commit
```

**Commitlint:** Validate commit messages
```bash
# Already configured in pre-commit hooks
git commit -m "invalid: message"  # Will fail
```

### Validation

Check if your commits follow conventions:
```bash
# View recent commits
git log --oneline

# Should look like:
# feat(tools): add new deployment option
# fix(logs): handle empty files
# docs(api): clarify parameters
```

### References

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

## Summary

**Remember:**
1. **Use conventional commits** for all changes
2. **Choose the right type** (feat, fix, docs, etc.)
3. **Mark breaking changes** with ! or BREAKING CHANGE
4. **Write clear descriptions** in imperative mood
5. **Let automation handle versioning** based on commits
6. **Review changelog** before releases

Following these guidelines ensures:
- Automatic correct version bumps
- Clear, useful changelogs
- Predictable releases
- Better collaboration
- Happy users

For quick reference, see [RELEASE_QUICKSTART.md](./RELEASE_QUICKSTART.md).
