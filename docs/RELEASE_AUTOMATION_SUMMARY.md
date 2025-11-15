# Release Automation Summary

Complete release automation system for OBI MCP Server.

## Overview

Automated, secure, and fast release process from code commit to npm publication.

## Architecture

```
Developer                GitHub Actions              npm Registry
    |                          |                           |
    |-- npm run release ------>|                           |
    |   (local pre-checks)     |                           |
    |                          |                           |
    |-- git push --tags ------>|                           |
    |                          |                           |
    |                          |-- Validate ----           |
    |                          |   - Lint                  |
    |                          |   - Type Check            |
    |                          |   - Test Suite            |
    |                          |   - Build                 |
    |                          |                           |
    |                          |-- Generate Changelog      |
    |                          |   - Parse commits         |
    |                          |   - Categorize            |
    |                          |   - Format                |
    |                          |                           |
    |                          |-- Create Release          |
    |                          |   - GitHub Release        |
    |                          |   - Attach artifacts      |
    |                          |   - Release notes         |
    |                          |                           |
    |                          |-- Publish to npm -------->|
    |                          |   (skip if alpha)         |
    |                          |                           |
    |<-------- Success notification ----------------|      |
```

## Components

### 1. GitHub Actions Workflow

**File**: `.github/workflows/release.yml`

Multi-stage pipeline:
- **Validate**: Run all checks (lint, typecheck, tests, build)
- **Release**: Generate changelog, create GitHub release
- **Publish**: Publish to npm (skipped for alpha versions)
- **Notify**: Send release summary

**Key Features**:
- Automatic changelog generation from git commits
- Intelligent commit categorization (feat, fix, docs, etc.)
- Prerelease detection (alpha, beta, rc)
- Artifact attachment to releases
- Graceful error handling
- Comprehensive logging

### 2. Release Scripts

**File**: `package.json`

```json
{
  "scripts": {
    "preversion": "npm run lint && npm run typecheck && npm run test:all && npm run build",
    "version": "node scripts/generate-changelog.js && git add CHANGELOG.md",
    "postversion": "git push --follow-tags",
    "release": "npm version patch -m 'chore(release): %s'",
    "release:minor": "npm version minor -m 'chore(release): %s'",
    "release:major": "npm version major -m 'chore(release): %s'",
    "release:alpha": "npm version prerelease --preid=alpha -m 'chore(release): %s'",
    "release:beta": "npm version prerelease --preid=beta -m 'chore(release): %s'",
    "release:dry": "npm version --no-git-tag-version"
  }
}
```

**Lifecycle Hooks**:
- `preversion`: Run all validations before version bump
- `version`: Generate changelog from git history
- `postversion`: Push changes and tags to GitHub

### 3. Changelog Generator

**File**: `scripts/generate-changelog.js`

Smart changelog generation:
- Parses git commit history
- Categorizes by conventional commit types
- Links to commit hashes
- Maintains version history
- Follows Keep a Changelog format
- Adheres to Semantic Versioning

**Commit Categories**:
- Features (feat:)
- Bug Fixes (fix:)
- Performance (perf:)
- Refactoring (refactor:)
- Documentation (docs:)
- Tests (test:)
- Maintenance (chore:, ci:, build:)

### 4. npm Publishing Configuration

**File**: `package.json`

```json
{
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**File**: `.npmignore`

Controls published package contents:
- Includes: compiled code (dist/), README, CHANGELOG, LICENSE
- Excludes: source code, tests, docs, CI configs, dev tools

### 5. Documentation

**Files**:
- `docs/RELEASING.md` - Complete release guide (8KB)
- `docs/RELEASE_QUICKSTART.md` - Quick reference (3KB)
- `.github/RELEASE_TEMPLATE.md` - Release checklist
- `CHANGELOG.md` - Version history

## Usage

### Quick Release

```bash
# Patch release (0.1.0 -> 0.1.1)
npm run release

# Minor release (0.1.0 -> 0.2.0)
npm run release:minor

# Major release (0.1.0 -> 1.0.0)
npm run release:major

# Alpha release (0.1.0 -> 0.1.1-alpha.0)
npm run release:alpha
```

### What Happens

1. **Local Pre-checks** (preversion hook)
   - ESLint validation
   - TypeScript type checking
   - Full test suite execution
   - TypeScript compilation

2. **Version Bump** (version hook)
   - Update package.json version
   - Generate/update CHANGELOG.md from git commits
   - Stage changelog for commit

3. **Commit and Tag** (npm version)
   - Create commit: "chore(release): x.x.x"
   - Create git tag: "vx.x.x"

4. **Push** (postversion hook)
   - Push commit to main branch
   - Push tags to trigger GitHub Actions

5. **GitHub Actions** (automated)
   - Validate all checks pass
   - Build production artifacts
   - Generate release notes
   - Create GitHub release
   - Publish to npm (if not alpha)
   - Send notification

## Semantic Versioning Strategy

### Current Phase: MVP (0.x.x)

- **PATCH** (0.1.0 -> 0.1.1): Bug fixes
- **MINOR** (0.1.0 -> 0.2.0): New features OR breaking changes
- **MAJOR**: Reserved for post-1.0.0

### Post-1.0.0

- **PATCH** (1.0.0 -> 1.0.1): Bug fixes only
- **MINOR** (1.0.0 -> 1.1.0): New features, backward compatible
- **MAJOR** (1.0.0 -> 2.0.0): Breaking changes

### Prereleases

- **ALPHA** (0.1.0-alpha.0): Experimental, NOT published to npm
- **BETA** (0.1.0-beta.0): Testing, NOT published to npm
- **RC** (0.1.0-rc.0): Release candidate, optional npm publish

## Commit Convention

Follow Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples

```bash
git commit -m "feat(tools): add obi_deploy_local tool"
git commit -m "fix(status): handle missing PID file gracefully"
git commit -m "docs(readme): update installation instructions"
git commit -m "perf(manager): optimize process polling"
git commit -m "refactor(utils): simplify error handling"
git commit -m "test(integration): add OBI deployment tests"
git commit -m "chore(deps): update dependencies"
```

## Security

- npm token stored as GitHub secret (NPM_TOKEN)
- No credentials in code or config files
- Automated security through GitHub Actions
- Publish access controlled via npm authentication

## Monitoring

### GitHub Actions

View workflow runs:
```
https://github.com/raibid-labs/obi-mcp/actions/workflows/release.yml
```

### GitHub Releases

View published releases:
```
https://github.com/raibid-labs/obi-mcp/releases
```

### npm Package

Check published versions:
```
https://www.npmjs.com/package/obi-mcp-server
```

## Rollback Procedure

If a release has critical issues:

1. **Delete GitHub Release**
   - Navigate to releases
   - Delete problematic release

2. **Remove Git Tag**
   ```bash
   git tag -d vX.X.X
   git push origin :refs/tags/vX.X.X
   ```

3. **Unpublish from npm** (within 72 hours)
   ```bash
   npm unpublish obi-mcp-server@X.X.X
   ```

4. **Fix and Re-release**
   ```bash
   # Fix the issue
   git commit -m "fix: critical issue from previous release"
   npm run release
   ```

## Performance Metrics

- **Local pre-checks**: ~30-60 seconds
- **GitHub Actions validation**: ~2-3 minutes
- **Total release time**: ~3-5 minutes
- **npm propagation**: 5-10 minutes globally

## Future Enhancements

Planned improvements:

- [ ] Automated release notes categorization
- [ ] Slack/Discord notifications
- [ ] Release metrics dashboard
- [ ] Automated dependency updates (Dependabot)
- [ ] Security vulnerability scanning in CI
- [ ] Performance benchmarking in releases
- [ ] Multi-platform binary builds
- [ ] Docker image publishing
- [ ] Release candidate automation

## Troubleshooting

### Common Issues

1. **Pre-checks fail**
   - Run locally: `npm run lint && npm run typecheck && npm run test:all`
   - Fix issues before releasing

2. **GitHub Actions fail**
   - Check workflow logs
   - Verify all secrets configured
   - Ensure main branch is up to date

3. **npm publish fails**
   - Verify NPM_TOKEN secret is set
   - Check npm package name availability
   - Ensure version doesn't already exist

4. **Changelog not generated**
   - Verify commits follow conventional format
   - Check git history exists
   - Ensure script has execute permissions

## Best Practices

1. **Always use conventional commits**
2. **Run local checks before releasing**
3. **Review changelog before pushing**
4. **Monitor GitHub Actions after push**
5. **Test npm package after publication**
6. **Keep release notes meaningful**
7. **Tag releases appropriately (alpha, beta, stable)**
8. **Document breaking changes clearly**

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions](https://docs.github.com/en/actions)

## Support

For issues or questions:
- GitHub Issues: https://github.com/raibid-labs/obi-mcp/issues
- Discussions: https://github.com/raibid-labs/obi-mcp/discussions
