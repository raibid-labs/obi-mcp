# Contributing to OBI MCP Server

Thank you for your interest in contributing to the OBI MCP Server! This document provides guidelines and instructions for contributing.

## 🌟 Ways to Contribute

- **Code**: Implement new features, fix bugs, improve performance
- **Documentation**: Improve docs, add examples, write tutorials
- **Testing**: Add test cases, report bugs, verify fixes
- **Design**: Propose UX improvements, create diagrams
- **Community**: Answer questions, help others, share use cases

## 🚀 Getting Started

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

## 📝 Development Workflow

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
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add obi_deploy_local tool"
# or
git commit -m "fix: resolve memory leak in process manager"
# or
git commit -m "docs: update installation instructions"
```

Commit message format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/my-awesome-feature
```

Then create a Pull Request on GitHub.

## 📋 Pull Request Guidelines

### PR Title

Follow Conventional Commits format:
```
feat: add Docker deployment support
fix: resolve config merge issue
docs: improve Quick Start guide
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

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] All tests pass
- [ ] Code follows style guidelines
```

### Review Process

1. Automated checks must pass (linting, tests, type checking)
2. At least one maintainer review required
3. Address review feedback
4. Squash commits if requested
5. Merge after approval

## 🧪 Writing Tests

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
  });
});
```

### Coverage Requirements

- New code should have >80% test coverage
- Critical paths require 100% coverage
- Integration tests for major features

## 📖 Documentation Guidelines

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

- Keep examples up-to-date
- Add new features to feature list
- Update installation instructions if needed

## 🎨 Code Style

We use ESLint and Prettier for consistent code style.

### TypeScript Best Practices

```typescript
// ✓ Good
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}`;
}

// ✗ Bad
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

## 🐛 Reporting Bugs

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
Any other relevant information.
```

## 💡 Feature Requests

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

## 🏆 Recognition

Contributors will be:
- Listed in README acknowledgments
- Mentioned in release notes
- Eligible for "Contributor" badge
- Invited to maintainer team (for consistent contributors)

## 📞 Getting Help

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Slack**: Join `#otel-ebpf-instrumentation` on CNCF Slack
- **Email**: [maintainer@example.com](mailto:maintainer@example.com)

## 📜 Code of Conduct

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

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to OBI MCP Server! 🎉
