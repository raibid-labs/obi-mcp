# Semantic Release Guide

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and package publishing.

## Overview

Semantic Release automates the entire package release workflow including:
- Determining the next version number based on commit messages
- Generating release notes and changelog
- Creating GitHub releases
- Publishing to npm (when NPM_TOKEN is configured)
- Committing version bumps and changelog updates

## How It Works

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Each commit message should be structured as:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types and Version Bumps

| Commit Type | Version Bump | Description | Example |
|------------|--------------|-------------|---------|
| `feat` | Minor (0.x.0) | New feature | `feat: add OBI metric collection` |
| `fix` | Patch (0.0.x) | Bug fix | `fix: resolve memory leak in collector` |
| `perf` | Patch (0.0.x) | Performance improvement | `perf: optimize trace processing` |
| `docs` | Patch (0.0.x) | Documentation changes | `docs: update API reference` |
| `refactor` | Patch (0.0.x) | Code refactoring | `refactor: simplify handler logic` |
| `revert` | Patch (0.0.x) | Revert previous commit | `revert: undo feature X` |
| `BREAKING CHANGE` | Major (x.0.0) | Breaking API change | See below |
| `style` | No release | Code style changes | `style: format with prettier` |
| `test` | No release | Test additions/changes | `test: add integration tests` |
| `build` | No release | Build system changes | `build: update webpack config` |
| `ci` | No release | CI configuration changes | `ci: add deploy job` |
| `chore` | No release | Maintenance tasks | `chore: update dependencies` |

### Breaking Changes

To trigger a major version bump, include `BREAKING CHANGE:` in the commit footer:

```
feat: redesign MCP server API

BREAKING CHANGE: The server initialization signature has changed.
Users must now pass configuration as an object instead of individual parameters.
```

Or use the `!` notation:

```
feat!: redesign MCP server API
```

## Configuration

### Release Configuration (.releaserc.json)

The semantic-release configuration is defined in `/home/beengud/raibid-labs/obi-mcp/.releaserc.json`:

**Branches:**
- `main` - Production releases
- `beta` - Beta pre-releases
- `alpha` - Alpha pre-releases

**Plugins:**
1. **@semantic-release/commit-analyzer** - Analyzes commits to determine release type
2. **@semantic-release/release-notes-generator** - Generates release notes
3. **@semantic-release/changelog** - Updates CHANGELOG.md
4. **@semantic-release/npm** - Publishes to npm registry
5. **@semantic-release/github** - Creates GitHub releases
6. **@semantic-release/git** - Commits version and changelog updates

### GitHub Workflow

The release workflow (`.github/workflows/release.yml`) triggers on every push to `main`:

1. **Validate Job** - Runs linting, type checking, tests, and builds
2. **Release Job** - Runs semantic-release to create release
3. **Notify Job** - Sends release notifications (if new release)

## Usage

### Automated Releases (Recommended)

Simply push commits with conventional commit messages to the `main` branch:

```bash
# Make changes
git add .
git commit -m "feat: add new MCP tool for trace analysis"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Analyze your commits
2. Determine the next version
3. Update CHANGELOG.md
4. Create a GitHub release
5. Publish to npm (if NPM_TOKEN configured)

### Local Testing

Test what semantic-release will do without actually releasing:

```bash
# Dry run - see what would be released
npm run semantic-release:dry

# Run locally without CI checks (use with caution)
npm run semantic-release:no-ci
```

### Manual Release (Emergency)

If you need to trigger a release manually:

```bash
# Set required environment variables
export GITHUB_TOKEN=your_github_token
export NPM_TOKEN=your_npm_token  # optional

# Run semantic-release
npm run semantic-release
```

## NPM Publishing

### Setup NPM Token

To enable automatic npm publishing:

1. Create an npm access token at https://www.npmjs.com/settings/tokens
2. Add it as a GitHub secret named `NPM_TOKEN`
3. Go to repository Settings > Secrets and variables > Actions
4. Click "New repository secret"
5. Name: `NPM_TOKEN`
6. Value: Your npm token

The release workflow will automatically publish to npm when:
- A new release is created
- NPM_TOKEN is configured
- The build is successful

### Disable NPM Publishing

If you don't want to publish to npm:
- Simply don't set the NPM_TOKEN secret
- The workflow will skip npm publishing but still create GitHub releases

## Pre-releases

### Beta Releases

Create a `beta` branch for beta releases:

```bash
git checkout -b beta
git push origin beta
```

Commits to `beta` will create beta releases (e.g., `1.0.0-beta.1`)

### Alpha Releases

Create an `alpha` branch for alpha releases:

```bash
git checkout -b alpha
git push origin alpha
```

Commits to `alpha` will create alpha releases (e.g., `1.0.0-alpha.1`)

## Changelog

The CHANGELOG.md is automatically generated and includes:

- **Features** - New functionality (`feat` commits)
- **Bug Fixes** - Bug fixes (`fix` commits)
- **Performance Improvements** - Performance enhancements (`perf` commits)
- **Documentation** - Documentation changes (`docs` commits)
- **Code Refactoring** - Code refactoring (`refactor` commits)
- **Reverts** - Reverted changes (`revert` commits)

## GitHub Releases

Each release automatically includes:

- Release notes generated from commits
- Distribution tarball (`.tgz` file)
- Links to closed issues and PRs
- Comments on related PRs and issues

## Troubleshooting

### No Release Created

If semantic-release doesn't create a release:

1. Check that commits follow conventional format
2. Verify commits include release-worthy types (`feat`, `fix`, etc.)
3. Check GitHub Actions logs for errors
4. Ensure `GITHUB_TOKEN` has proper permissions

### NPM Publish Failed

If npm publishing fails:

1. Verify NPM_TOKEN is valid and has publish permissions
2. Check package name is available on npm
3. Verify `publishConfig` in package.json is correct
4. Check npm audit for vulnerabilities blocking publish

### Version Conflicts

If you see version conflicts:

1. Ensure you're not manually editing version in package.json
2. Let semantic-release manage all version bumps
3. If needed, reset to the last release tag

## Best Practices

1. **Write Clear Commit Messages** - Follow conventional commits strictly
2. **One Logical Change Per Commit** - Makes it easier to track what triggers releases
3. **Use Scopes** - Help organize changelog (e.g., `feat(auth): add JWT support`)
4. **Document Breaking Changes** - Always explain what breaks and how to migrate
5. **Test Before Merging** - CI validates everything before release
6. **Don't Skip CI** - Releases include `[skip ci]` automatically
7. **Monitor Releases** - Check GitHub releases and npm to ensure success

## Examples

### Feature Addition

```bash
git commit -m "feat(tools): add trace sampling tool

Implements a new MCP tool for configuring trace sampling rates.
Supports percentage-based and rate-based sampling strategies."
```

### Bug Fix

```bash
git commit -m "fix(collector): prevent null pointer in metric aggregation

Adds null check before accessing metric labels to prevent crashes
when processing malformed metric data."
```

### Breaking Change

```bash
git commit -m "feat(api)!: redesign server initialization

BREAKING CHANGE: Server initialization now requires a config object.

Migration:
- Old: new MCPServer(port, host)
- New: new MCPServer({ port, host })"
```

### Documentation Update

```bash
git commit -m "docs(readme): add installation instructions

Includes detailed steps for npm, Docker, and source installation."
```

## Scripts Reference

| Script | Description | Usage |
|--------|-------------|-------|
| `npm run semantic-release` | Run semantic-release | CI only |
| `npm run semantic-release:dry` | Dry run to preview release | Local testing |
| `npm run semantic-release:no-ci` | Run without CI checks | Emergency only |

## Resources

- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub Actions Workflow](.github/workflows/release.yml)
- [Release Configuration](.releaserc.json)
- [Commit Linting Guide](CONTRIBUTING.md#commit-messages)

## Support

For issues with semantic-release:
1. Check the troubleshooting section above
2. Review GitHub Actions workflow logs
3. Consult [semantic-release documentation](https://semantic-release.gitbook.io/)
4. Open an issue in this repository
