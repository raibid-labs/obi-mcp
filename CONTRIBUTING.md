# Contributing to OBI MCP Server

Thank you for your interest in contributing to the OBI MCP Server! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Writing Tests](#writing-tests)
- [Documentation Guidelines](#documentation-guidelines)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Recognition](#recognition)
- [Code of Conduct](#code-of-conduct)

## Ways to Contribute

- **Code**: Implement new features, fix bugs, improve performance
- **Documentation**: Improve docs, add examples, write tutorials
- **Testing**: Add test cases, report bugs, verify fixes
- **Design**: Propose UX improvements, create diagrams
- **Community**: Answer questions, help others, share use cases

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Git
- Linux system (for testing OBI integration)
- OBI binary installed (optional, for integration tests)

### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/obi-mcp-server.git
cd obi-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-awesome-feature
# or
git checkout -b fix/issue-123
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements

### 2. Make Your Changes

- Write clean, readable TypeScript code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm test

# Run specific test file
npm test tests/unit/your-test.test.ts

# Or run all quality checks
npm run lint && npm run typecheck && npm run test:all && npm run build
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification. This is **required** for automated versioning and changelog generation.

**See the detailed guide:** [docs/SEMANTIC_VERSIONING.md](./docs/SEMANTIC_VERSIONING.md)

#### Quick Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### Common Types

| Type | Use For | Version Impact | Example |
|------|---------|----------------|---------|
| `feat` | New features | MINOR bump | `feat(tools): add restart tool` |
| `fix` | Bug fixes | PATCH bump | `fix(status): handle edge case` |
| `docs` | Documentation | PATCH bump | `docs(api): update examples` |
| `perf` | Performance | PATCH bump | `perf(logs): optimize reading` |
| `refactor` | Code cleanup | PATCH bump | `refactor: simplify manager` |
| `test` | Tests | PATCH bump | `test: add E2E tests` |
| `chore` | Maintenance | PATCH bump | `chore(deps): update packages` |
| `ci` | CI/CD changes | PATCH bump | `ci: add coverage reporting` |
| `build` | Build system | PATCH bump | `build: update tsconfig` |
| `feat!` | Breaking change | MAJOR bump | `feat!: change API format` |

#### Good Examples

```bash
# New feature
git commit -m "feat(tools): add Docker deployment support"

# Bug fix
git commit -m "fix(status): prevent crash when OBI is not running"

# Breaking change
git commit -m "feat(config)!: restructure configuration schema

BREAKING CHANGE: Configuration format has changed.
Migration required - see docs/MIGRATION.md"

# Documentation
git commit -m "docs(readme): add troubleshooting section"

# With body and footer
git commit -m "feat(logs): add filtering by log level

Add support for filtering logs by severity level (info, warn, error, debug).
This makes it easier to find relevant log entries.

Closes #42"
```

#### Bad Examples

```bash
# ❌ Too vague
git commit -m "fix: bug"
git commit -m "feat: updates"

# ❌ Wrong type
git commit -m "update: add new feature"  # Should be "feat"
git commit -m "bug: fix issue"           # Should be "fix"

# ❌ Missing scope (when it would help)
git commit -m "feat: add feature"        # Better: "feat(tools): add feature"
```

#### Detailed Guidelines

**Subject Line (required):**
- Use imperative mood: "add feature" not "added feature"
- Start with lowercase (after type and scope)
- No period at the end
- Keep under 72 characters
- Be specific and descriptive

**Scope (optional but recommended):**
Common scopes:
- `tools` - MCP tools
- `resources` - MCP resources
- `prompts` - MCP prompts
- `config` - Configuration handling
- `manager` - OBI manager
- `server` - MCP server
- `tests` - Test infrastructure
- `docs` - Documentation
- `deps` - Dependencies

**Body (optional but recommended for complex changes):**
- Wrap at 72 characters
- Separate from subject with blank line
- Explain WHAT and WHY, not HOW
- Use multiple paragraphs if needed

**Footer (optional):**
- Breaking changes (required for breaking changes)
- Issue references (`Fixes #123`, `Closes #45`)
- Co-authors
- Reviewers

**For more details and examples, see:** [docs/SEMANTIC_VERSIONING.md](./docs/SEMANTIC_VERSIONING.md)

### 5. Push and Create Pull Request

```bash
git push origin feature/my-awesome-feature
```

Then create a Pull Request on GitHub.

## Commit Message Guidelines

### Why This Matters

Conventional commits enable:
- **Automatic versioning** - Version bumps determined from commits
- **Auto-generated changelogs** - Clear, categorized release notes
- **Better collaboration** - Consistent, understandable history
- **Searchable history** - Easy to find specific types of changes

### Validation

Your commit messages will be validated. Non-conventional commits may be rejected.

```bash
# View your recent commits to verify format
git log --oneline -10

# Should look like:
# feat(tools): add new deployment option
# fix(logs): handle empty files
# docs(api): clarify parameters
```

### Tools

**Commitizen (optional):**
Interactive commit message builder:
```bash
npm install -g commitizen
git cz  # Instead of git commit
```

**Commitlint:**
Already configured to validate commit messages in pre-commit hooks.

### Breaking Changes

Breaking changes MUST be indicated:

**Option 1: Use `!` after type/scope**
```bash
git commit -m "feat(api)!: change status response format"
```

**Option 2: Add `BREAKING CHANGE:` footer**
```bash
git commit -m "feat(api): change status response format

BREAKING CHANGE: Status response is now JSON instead of text.
Update clients to parse the new format."
```

**Both trigger a MAJOR version bump and appear prominently in the changelog.**

### Multi-line Commits

For complex changes, use your editor:

```bash
git commit
```

Then write:
```
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

### Issue References

Link commits to issues:

```bash
# Single issue
git commit -m "fix(status): handle missing PID file

Fixes #92"

# Multiple issues
git commit -m "feat(tools): add deployment tools

Closes #45, #67
Related to #89"
```

## Pull Request Guidelines

### PR Title

Follow Conventional Commits format:
```
feat(tools): add Docker deployment support
fix(config): resolve merge issue
docs(readme): improve Quick Start guide
```

### PR Description

Include:
- **What**: Brief description of changes
- **Why**: Motivation and context
- **How**: Implementation approach
- **Testing**: How you tested the changes
- **Screenshots**: If applicable (for UI changes)

Template:
```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How did you test these changes?

## Breaking Changes
List any breaking changes and migration steps (if applicable)

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Commit messages follow conventional format
- [ ] All tests pass
- [ ] Code follows style guidelines
```

### Review Process

1. Automated checks must pass (linting, tests, type checking)
2. At least one maintainer review required
3. Address review feedback
4. Squash commits if requested (maintainer will handle this)
5. Merge after approval

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup
  });

  describe('myMethod', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = myMethod(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });
  });
});
```

### Coverage Requirements

- New code should have >80% test coverage
- Critical paths require 100% coverage
- Integration tests for major features
- E2E tests for complete workflows

### Running Tests

```bash
# All tests
npm test

# Specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Specific file
npm test tests/unit/tools/status.test.ts
```

## Documentation Guidelines

### Code Documentation

Use TSDoc comments for public APIs:

```typescript
/**
 * Deploy OBI in standalone mode
 *
 * @param options - Deployment configuration
 * @returns Promise resolving to control result
 *
 * @example
 * ```typescript
 * const result = await obiManager.deployLocal({
 *   mode: 'standalone',
 *   config: { network: { enable: true } }
 * });
 * ```
 */
async deployLocal(options: ObiDeploymentOptions): Promise<ObiControlResult> {
  // Implementation
}
```

### README Updates

When adding new features:
- Update feature list
- Add usage examples
- Update table of contents if needed
- Add links to detailed documentation

### API Documentation

For new tools, resources, or prompts:
- Add to `docs/API.md`
- Include complete parameter documentation
- Provide usage examples
- Document return values

### Documentation Commits

```bash
# Good documentation commits
git commit -m "docs(api): document new obi_restart tool"
git commit -m "docs(readme): add Docker deployment example"
git commit -m "docs(architecture): add component diagram"
```

## Code Style

We use ESLint and Prettier for consistent code style.

### TypeScript Best Practices

```typescript
// ✓ Good - Explicit types
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}`;
}

// ✗ Bad - Using any
function greet(user: any) {
  return `Hello, ${user.name}`;
}
```

### Naming Conventions

- **Files**: kebab-case (`obi-manager.ts`)
- **Classes**: PascalCase (`ObiManager`)
- **Functions**: camelCase (`getStatus`)
- **Constants**: UPPER_SNAKE_CASE (`OBI_RESOURCE_URIS`)
- **Interfaces**: PascalCase (`ObiConfig`)
- **Types**: PascalCase (`ObiStatus`)

### Import Order

```typescript
// 1. Node built-ins
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

// 2. External dependencies
import { z } from 'zod';
import YAML from 'yaml';

// 3. Internal modules
import logger from '../utils/logger.js';
import { ObiConfig } from '../types/obi.js';
```

### Code Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format -- --check

# Auto-fix linting issues
npm run lint:fix
```

## Reporting Bugs

### Before Reporting

1. Search existing issues
2. Check if it's already fixed in `main`
3. Try to reproduce with minimal example

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- OBI MCP Server: [e.g., 0.1.0]
- OBI Version: [e.g., 0.1.0-alpha]

## Additional Context
Any other relevant information, logs, or screenshots.
```

## Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why is this feature needed? Who will use it?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Mockups, examples, links to similar features, etc.
```

## Recognition

Contributors will be:
- Listed in README acknowledgments
- Mentioned in release notes
- Eligible for "Contributor" badge
- Invited to maintainer team (for consistent contributors)

## Getting Help

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Slack**: Join `#otel-ebpf-instrumentation` on CNCF Slack
- **Documentation**: See [docs/](./docs/) for guides

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity, level of experience, nationality, personal appearance, race, religion, or sexual identity.

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior:**
- Harassment, trolling, or insulting comments
- Publishing private information without permission
- Other unprofessional conduct

### Enforcement

Violations may result in temporary or permanent ban from the project.

Report violations to the project maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Additional Resources

- **Release Guide**: [docs/RELEASING.md](./docs/RELEASING.md)
- **Semantic Versioning**: [docs/SEMANTIC_VERSIONING.md](./docs/SEMANTIC_VERSIONING.md)
- **Architecture**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **API Reference**: [docs/API.md](./docs/API.md)

---

Thank you for contributing to OBI MCP Server!

**Remember:** Good commit messages = automatic versioning + great changelogs!
