# Semantic Release Setup Summary

## Installation Completed

The OBI MCP Server project has been successfully configured with semantic-release for automated versioning and releases.

## Installed Packages

All packages have been installed as dev dependencies in `/home/beengud/raibid-labs/obi-mcp/package.json`:

```json
{
  "devDependencies": {
    "semantic-release": "^25.0.2",
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "@semantic-release/github": "^12.0.2",
    "@semantic-release/npm": "^13.1.2"
  }
}
```

## Configuration Files

### 1. .releaserc.json

Location: `/home/beengud/raibid-labs/obi-mcp/.releaserc.json`

**Configured Branches:**
- `main` - Production releases (e.g., 1.0.0)
- `beta` - Beta pre-releases (e.g., 1.0.0-beta.1)
- `alpha` - Alpha pre-releases (e.g., 1.0.0-alpha.1)

**Configured Plugins (in order):**

1. **@semantic-release/commit-analyzer**
   - Analyzes conventional commits to determine release type
   - Configured with conventionalcommits preset
   - Custom release rules for each commit type
   - Breaking change detection via BREAKING CHANGE footer

2. **@semantic-release/release-notes-generator**
   - Generates release notes from commits
   - Organizes by type: Features, Bug Fixes, Performance, etc.
   - Hides non-user-facing changes (style, test, build, ci, chore)

3. **@semantic-release/changelog**
   - Updates `/home/beengud/raibid-labs/obi-mcp/CHANGELOG.md`
   - Follows Conventional Commits format
   - Automatically committed by @semantic-release/git

4. **@semantic-release/npm**
   - Creates tarball in dist/ directory
   - Publishing to npm registry: **DISABLED by default**
   - To enable: Set `"npmPublish": true` in .releaserc.json AND add NPM_TOKEN secret

5. **@semantic-release/github**
   - Creates GitHub releases with generated notes
   - Attaches distribution tarball (.tgz) as asset
   - Comments on related PRs and issues

6. **@semantic-release/git**
   - Commits version changes to package.json, package-lock.json
   - Commits updated CHANGELOG.md
   - Commit message: `chore(release): <version> [skip ci]`
   - Push back to repository with [skip ci] to prevent loop

## Package.json Scripts

Added to `/home/beengud/raibid-labs/obi-mcp/package.json`:

```json
{
  "scripts": {
    "semantic-release": "semantic-release",
    "semantic-release:dry": "semantic-release --dry-run",
    "semantic-release:no-ci": "semantic-release --no-ci"
  }
}
```

**Script Usage:**
- `npm run semantic-release` - Run semantic-release (used in CI)
- `npm run semantic-release:dry` - Preview release without making changes
- `npm run semantic-release:no-ci` - Run locally without CI checks (use with caution)

## GitHub Actions Workflow

Location: `/home/beengud/raibid-labs/obi-mcp/.github/workflows/release.yml`

**Workflow already configured with:**
- Validates code quality (lint, typecheck, test, build)
- Runs semantic-release on main branch pushes
- Creates GitHub releases automatically
- Conditional npm publishing (if NPM_TOKEN is set)
- Release notifications

**Required Permissions:**
- `contents: write` - For creating releases and pushing changes
- `issues: write` - For commenting on issues
- `pull-requests: write` - For commenting on PRs
- `packages: write` - For publishing packages

## Version Bump Rules

Based on conventional commits:

| Commit Type | Version Change | Example |
|-------------|----------------|---------|
| `feat:` | Minor (0.x.0) | 0.1.0 -> 0.2.0 |
| `fix:` | Patch (0.0.x) | 0.1.0 -> 0.1.1 |
| `perf:` | Patch (0.0.x) | 0.1.0 -> 0.1.1 |
| `docs:` | Patch (0.0.x) | 0.1.0 -> 0.1.1 |
| `refactor:` | Patch (0.0.x) | 0.1.0 -> 0.1.1 |
| `revert:` | Patch (0.0.x) | 0.1.0 -> 0.1.1 |
| `BREAKING CHANGE` | Major (x.0.0) | 0.1.0 -> 1.0.0 |
| `style:`, `test:`, `build:`, `ci:`, `chore:` | No release | - |

## NPM Publishing Configuration

**Current Status:** DISABLED

To enable npm publishing:

1. **Create NPM Token:**
   ```bash
   # Login to npmjs.com
   # Go to Access Tokens: https://www.npmjs.com/settings/tokens
   # Create "Automation" token with "Publish" permission
   ```

2. **Add GitHub Secret:**
   ```bash
   # Go to: https://github.com/raibid-labs/obi-mcp/settings/secrets/actions
   # Click "New repository secret"
   # Name: NPM_TOKEN
   # Value: <your-npm-token>
   ```

3. **Enable Publishing:**
   Edit `/home/beengud/raibid-labs/obi-mcp/.releaserc.json`:
   ```json
   {
     "plugins": [
       [
         "@semantic-release/npm",
         {
           "npmPublish": true,  // Change from false to true
           "tarballDir": "dist"
         }
       ]
     ]
   }
   ```

## Testing the Setup

Test semantic-release without making actual releases:

```bash
# Change to project directory
cd /home/beengud/raibid-labs/obi-mcp

# Run dry-run to see what would happen
npm run semantic-release:dry
```

**Dry-run output shows:**
- Which commits were analyzed
- Whether a release would be created
- What the next version would be
- What changes would be made

## Usage Instructions

### Automated Release (Recommended)

1. **Make changes to the code**

2. **Commit with conventional format:**
   ```bash
   git add .
   git commit -m "feat: add trace sampling configuration tool"
   ```

3. **Push to main:**
   ```bash
   git push origin main
   ```

4. **GitHub Actions will automatically:**
   - Run all validations
   - Analyze commits
   - Determine next version
   - Update CHANGELOG.md
   - Update package.json version
   - Create GitHub release
   - Publish to npm (if enabled)
   - Comment on related PRs/issues

### Manual Release (Emergency Only)

```bash
# Set environment variables
export GITHUB_TOKEN=<your-github-token>
export NPM_TOKEN=<your-npm-token>  # optional

# Run semantic-release
npm run semantic-release
```

## Commit Message Examples

### Feature (Minor Release)
```bash
git commit -m "feat: add support for custom OBI configurations

Implements configuration file parsing for OBI-specific settings.
Users can now specify custom eBPF programs and sampling rates."
```

### Bug Fix (Patch Release)
```bash
git commit -m "fix: prevent crash when OBI process exits unexpectedly

Added proper error handling and cleanup when OBI terminates.
Resolves #123"
```

### Breaking Change (Major Release)
```bash
git commit -m "feat!: redesign server initialization API

BREAKING CHANGE: Server constructor now requires config object.

Migration:
- Old: new MCPServer(port, host)
- New: new MCPServer({ port, host, config })"
```

### Documentation (Patch Release)
```bash
git commit -m "docs: add installation guide for Docker deployment"
```

### Non-Release Commit
```bash
git commit -m "chore: update development dependencies"
# This won't trigger a release
```

## Documentation

Comprehensive documentation has been created:

1. **Full Guide:** `/home/beengud/raibid-labs/obi-mcp/docs/SEMANTIC_RELEASE.md`
   - Complete semantic-release documentation
   - Detailed configuration explanation
   - Troubleshooting guide
   - Best practices

2. **Quick Reference:** `/home/beengud/raibid-labs/obi-mcp/docs/QUICK_RELEASE_GUIDE.md`
   - TL;DR version
   - Common commit types
   - Quick examples

## Validation

The configuration has been validated with a dry-run test:

```bash
$ npm run semantic-release:dry
[semantic-release] › ℹ  Running semantic-release version 25.0.2
[semantic-release] › ✔  Loaded plugin "verifyConditions" from "@semantic-release/changelog"
[semantic-release] › ✔  Loaded plugin "verifyConditions" from "@semantic-release/npm"
[semantic-release] › ✔  Loaded plugin "verifyConditions" from "@semantic-release/github"
[semantic-release] › ✔  Loaded plugin "verifyConditions" from "@semantic-release/git"
[semantic-release] › ✔  Loaded plugin "analyzeCommits" from "@semantic-release/commit-analyzer"
[semantic-release] › ✔  Loaded plugin "generateNotes" from "@semantic-release/release-notes-generator"
...
[semantic-release] › ✔  Allowed to push to the Git repository
```

All plugins loaded successfully and configuration is valid.

## Next Steps

1. **Start using conventional commits** for all future commits
2. **Optional:** Enable npm publishing by adding NPM_TOKEN secret
3. **Optional:** Configure additional notifications in the workflow
4. **Review:** Check docs/SEMANTIC_RELEASE.md for detailed usage

## Monitoring Releases

- **GitHub Releases:** https://github.com/raibid-labs/obi-mcp/releases
- **GitHub Actions:** https://github.com/raibid-labs/obi-mcp/actions/workflows/release.yml
- **NPM Package:** https://www.npmjs.com/package/obi-mcp-server (when publishing enabled)

## Troubleshooting

### No Release Created

Check that:
- Commits follow conventional format
- Commits include release-worthy types (feat, fix, etc.)
- Not all commits are chore/style/test/build/ci types

### NPM Publish Failed

Verify:
- NPM_TOKEN is set in GitHub secrets
- Token has publish permissions
- Package name is available/owned by you
- npmPublish is set to true in .releaserc.json

### Version Conflicts

- Don't manually edit version in package.json
- Let semantic-release manage all versioning
- If conflicts occur, reset to last release tag

## Support

For questions or issues:
1. Check `/home/beengud/raibid-labs/obi-mcp/docs/SEMANTIC_RELEASE.md`
2. Review GitHub Actions logs
3. Consult https://semantic-release.gitbook.io/
4. Open an issue in the repository

---

**Setup completed successfully!**

You can now push conventional commits to `main` and releases will be created automatically.
