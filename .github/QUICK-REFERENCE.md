# CI/CD Quick Reference

## Quick Commands

### Local Testing (Before Push)

```bash
# Run all checks that CI will run
npm run typecheck && npm run lint && npm test -- --run && npm run build

# Individual checks
npm run typecheck  # Type checking
npm run lint       # Linting
npm test          # Tests (watch mode)
npm test -- --run # Tests (single run)
npm run build     # Build project

# Coverage
npm test -- --run --coverage

# Fix linting issues
npm run lint:fix
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push -u origin feature/your-feature
# Then create PR on GitHub

# After PR approval
git checkout main
git pull
git branch -d feature/your-feature
```

### Workflow Triggers

| Action | Workflows Triggered |
|--------|-------------------|
| Push to any branch | Quick Check |
| Push to main | Quick Check, CI |
| Create PR to main | Quick Check, CI, Test Suite |
| Push to PR branch | Quick Check, CI, Test Suite |
| Create tag v*.*.* | Release |
| Manual trigger | CI (from Actions tab) |

## Workflow Status

### Check Workflow Status

1. Go to: https://github.com/raibid-labs/obi-mcp/actions
2. Filter by:
   - Workflow name
   - Branch
   - Actor
   - Status (success/failure)

### Re-run Failed Workflow

1. Click on failed workflow run
2. Click "Re-run jobs" button
3. Choose:
   - Re-run failed jobs
   - Re-run all jobs

## Common Scenarios

### Scenario 1: Quick Fix
```bash
# 1. Create branch
git checkout -b fix/quick-fix

# 2. Make changes
# Edit files...

# 3. Test locally
npm test -- --run

# 4. Commit and push
git add .
git commit -m "fix: description"
git push -u origin fix/quick-fix

# 5. Create PR and wait for Quick Check (~3 min)
# If green, request review
```

### Scenario 2: Feature Development
```bash
# 1. Create branch
git checkout -b feature/new-feature

# 2. Develop with tests
npm run dev  # Development mode

# 3. Run tests frequently
npm test  # Watch mode

# 4. Before commit
npm run typecheck
npm run lint
npm test -- --run
npm run build

# 5. Commit, push, create PR
# Full CI runs (~10 min)
# Test suite runs (~15 min)
# Review PR comment for coverage
```

### Scenario 3: Dependency Update
```bash
# Dependabot creates PR automatically every Monday

# 1. Review Dependabot PR
# 2. Check for breaking changes
# 3. Verify CI passes
# 4. Approve and merge

# Manual dependency update:
npm update
npm test -- --run
git add package*.json
git commit -m "chore: update dependencies"
```

### Scenario 4: Release New Version
```bash
# 1. Ensure main is clean
git checkout main
git pull

# 2. Run all tests
npm test -- --run
npm run build

# 3. Create version (choose one)
npm run release        # Patch (0.1.0 -> 0.1.1)
npm run release:minor  # Minor (0.1.0 -> 0.2.0)
npm run release:major  # Major (0.1.0 -> 1.0.0)

# This will:
# - Run tests
# - Update version
# - Create git tag
# - Push tag
# - Trigger release workflow
# - Publish to npm
```

## Debugging Failed Workflows

### CI Failed at Quality Check
```bash
# Fix locally
npm run typecheck  # Check types
npm run lint       # Check linting
npm run lint:fix   # Auto-fix linting

# Commit fix
git add .
git commit -m "fix: resolve quality issues"
git push
```

### CI Failed at Tests
```bash
# Run tests locally
npm test -- --run

# Check specific test
npm test -- --run tests/path/to/test.spec.ts

# Debug test
npm test tests/path/to/test.spec.ts  # Watch mode

# Fix and commit
git add .
git commit -m "fix: resolve test failures"
git push
```

### CI Failed at Build
```bash
# Try build locally
npm run build

# Check TypeScript errors
npm run typecheck

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build

# Fix and commit
git add .
git commit -m "fix: resolve build issues"
git push
```

### Coverage Below Threshold
```bash
# Check coverage locally
npm test -- --run --coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux

# Add tests for uncovered code
# Commit and push
```

## Branch Protection

### Required Checks
- CI Success (must pass)
- Code Quality (must pass)
- Test (Node 18) (must pass)
- Test (Node 20) (must pass)
- Test (Node 22) (must pass)

### Override Protection
Only administrators can:
- Force push to main
- Bypass required checks
- Delete protected branch

## Secrets Management

### View Secrets
Settings → Secrets and variables → Actions

### Required Secrets
- `CODECOV_TOKEN` - Coverage uploads
- `NPM_TOKEN` - Package publishing

### Add Secret
1. Go to repository Settings
2. Secrets and variables → Actions
3. New repository secret
4. Name: SECRET_NAME
5. Value: secret-value
6. Add secret

## Performance Tips

### Speed Up Local Development
```bash
# Use cache
npm ci --prefer-offline

# Run only changed tests
npm test -- --changed

# Skip coverage
npm test -- --run --no-coverage

# Parallel tests (Vitest does this by default)
npm test -- --run --pool=forks
```

### Speed Up CI
- Push multiple commits at once (CI runs once)
- Use draft PRs to skip some checks
- Fix quality issues before pushing
- Keep branches up to date

## Monitoring

### Workflow Metrics
- Average duration: Check Actions tab
- Success rate: Filter by status
- Most common failures: Review logs

### Coverage Trends
- Codecov dashboard: https://codecov.io/gh/raibid-labs/obi-mcp
- PR comments show coverage changes
- Downloadable HTML reports in artifacts

### Dependency Health
- Dependabot alerts: Security tab
- Dependency graph: Insights → Dependency graph
- Weekly update PRs: Monday mornings

## Useful Links

### Repository
- Actions: https://github.com/raibid-labs/obi-mcp/actions
- Issues: https://github.com/raibid-labs/obi-mcp/issues
- Pull Requests: https://github.com/raibid-labs/obi-mcp/pulls
- Settings: https://github.com/raibid-labs/obi-mcp/settings

### Documentation
- [CI/CD Setup](.github/CI-CD-SETUP.md)
- [Workflow README](.github/workflows/README.md)
- [Implementation Checklist](.github/IMPLEMENTATION-CHECKLIST.md)
- [Status Badges](.github/BADGES.md)

### External Services
- Codecov: https://codecov.io/gh/raibid-labs/obi-mcp
- npm: https://www.npmjs.com/package/obi-mcp-server

## Troubleshooting

### Issue: "npm ci" fails
```bash
# Delete lock file and reinstall
rm package-lock.json
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

### Issue: Cache issues
```bash
# Clear npm cache
npm cache clean --force

# In GitHub Actions:
# Go to Actions → Caches → Delete cache
```

### Issue: Workflow not triggering
- Check workflow file path (must be in `.github/workflows/`)
- Check YAML syntax
- Check trigger conditions (branches, paths)
- Check repository permissions

### Issue: Can't push to branch
- Check branch protection rules
- Ensure all required checks pass
- Request review if required
- Check if force push is disabled

## Getting Help

1. Check documentation in `.github/` directory
2. Review workflow logs in Actions tab
3. Search GitHub Issues
4. Create new issue with:
   - Error message
   - Workflow run URL
   - Steps to reproduce
   - Expected vs actual behavior

---

**Quick Start**: `npm run typecheck && npm run lint && npm test -- --run && npm run build`
**Create PR**: `git checkout -b feature/name && git push -u origin feature/name`
**Release**: `npm run release`
