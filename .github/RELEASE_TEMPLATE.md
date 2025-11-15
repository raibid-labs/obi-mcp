# Release Checklist Template

Use this template when preparing a release.

## Pre-Release Checklist

- [ ] All tests passing on main branch
- [ ] CI/CD pipeline green
- [ ] Documentation updated
- [ ] CHANGELOG.md reviewed (will be auto-generated)
- [ ] No critical bugs open
- [ ] All PRs for this release merged
- [ ] Breaking changes documented (if any)

## Version Decision

What type of release is this?

- [ ] Patch (bug fixes): `npm run release`
- [ ] Minor (new features): `npm run release:minor`
- [ ] Major (breaking changes): `npm run release:major`
- [ ] Alpha (experimental): `npm run release:alpha`
- [ ] Beta (testing): `npm run release:beta`

## Release Process

1. **Update Version**
   ```bash
   npm run release  # or release:minor/major/alpha/beta
   ```

2. **Verify Tag Created**
   ```bash
   git tag -l
   ```

3. **Monitor GitHub Actions**
   - Go to: https://github.com/raibid-labs/obi-mcp/actions
   - Verify release workflow completes
   - Check all jobs pass: validate, release, publish-npm, notify

4. **Verify GitHub Release**
   - Go to: https://github.com/raibid-labs/obi-mcp/releases
   - Confirm release created with correct version
   - Review auto-generated changelog
   - Check artifacts attached

5. **Verify npm Publication** (if not alpha)
   - Check: https://www.npmjs.com/package/obi-mcp-server
   - Wait 5-10 minutes for propagation
   - Test installation:
     ```bash
     npm install -g obi-mcp-server@latest
     obi-mcp-server --version
     ```

## Post-Release

- [ ] Update GitHub issues/PRs with release link
- [ ] Announce in relevant channels
- [ ] Update project documentation if needed
- [ ] Monitor for issues in first 24 hours

## Rollback (if needed)

If critical issues found:

1. **Delete GitHub Release**
   - Go to releases page
   - Delete the problematic release

2. **Remove Git Tag**
   ```bash
   git tag -d vX.X.X
   git push origin :refs/tags/vX.X.X
   ```

3. **Unpublish from npm** (within 72 hours only)
   ```bash
   npm unpublish obi-mcp-server@X.X.X
   ```

4. **Publish Hotfix**
   ```bash
   # Fix the issue
   npm run release  # Bump to next patch version
   ```

## Notes

- Automated tests will run before release
- Changelog auto-generated from git commits
- npm publication skipped for alpha versions
- Release notes created automatically
- GitHub Actions handles all deployment
