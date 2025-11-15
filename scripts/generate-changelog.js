#!/usr/bin/env node

/**
 * Changelog Generator
 *
 * Generates a CHANGELOG.md file from git commit history
 * Categorizes commits by type (feat, fix, docs, etc.)
 * Run automatically during version bumps via npm version hooks
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CHANGELOG_FILE = 'CHANGELOG.md';

// Get current version from package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const date = new Date().toISOString().split('T')[0];

console.log(`Generating changelog for version ${version}...`);

// Get previous tag
let previousTag;
try {
  previousTag = execSync('git describe --abbrev=0 --tags 2>/dev/null || echo ""', {
    encoding: 'utf8'
  }).trim();
} catch (error) {
  previousTag = '';
}

// Get commits since previous tag or all commits
let gitLogCommand;
if (previousTag) {
  gitLogCommand = `git log ${previousTag}..HEAD --pretty=format:"%s|||%h|||%an|||%ae" --no-merges`;
} else {
  gitLogCommand = 'git log --pretty=format:"%s|||%h|||%an|||%ae" --no-merges';
}

let commits;
try {
  const output = execSync(gitLogCommand, { encoding: 'utf8' });
  commits = output.split('\n').filter(line => line.trim());
} catch (error) {
  console.log('No commits found or error retrieving git log');
  commits = [];
}

// Parse and categorize commits
const categories = {
  features: [],
  fixes: [],
  docs: [],
  performance: [],
  refactor: [],
  tests: [],
  chores: [],
  other: []
};

commits.forEach(commit => {
  const [message, hash, author, email] = commit.split('|||');

  // Categorize based on conventional commit format
  if (/^feat(\(.*?\))?:/i.test(message)) {
    categories.features.push({ message, hash, author });
  } else if (/^fix(\(.*?\))?:/i.test(message)) {
    categories.fixes.push({ message, hash, author });
  } else if (/^docs(\(.*?\))?:/i.test(message)) {
    categories.docs.push({ message, hash, author });
  } else if (/^perf(\(.*?\))?:/i.test(message)) {
    categories.performance.push({ message, hash, author });
  } else if (/^refactor(\(.*?\))?:/i.test(message)) {
    categories.refactor.push({ message, hash, author });
  } else if (/^test(\(.*?\))?:/i.test(message)) {
    categories.tests.push({ message, hash, author });
  } else if (/^(chore|ci|build)(\(.*?\))?:/i.test(message)) {
    categories.chores.push({ message, hash, author });
  } else {
    categories.other.push({ message, hash, author });
  }
});

// Generate changelog content for this version
let newChangelog = `## [${version}] - ${date}\n\n`;

if (categories.features.length > 0) {
  newChangelog += '### Features\n\n';
  categories.features.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.fixes.length > 0) {
  newChangelog += '### Bug Fixes\n\n';
  categories.fixes.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.performance.length > 0) {
  newChangelog += '### Performance Improvements\n\n';
  categories.performance.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.refactor.length > 0) {
  newChangelog += '### Code Refactoring\n\n';
  categories.refactor.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.docs.length > 0) {
  newChangelog += '### Documentation\n\n';
  categories.docs.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.tests.length > 0) {
  newChangelog += '### Tests\n\n';
  categories.tests.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.other.length > 0) {
  newChangelog += '### Other Changes\n\n';
  categories.other.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

if (categories.chores.length > 0) {
  newChangelog += '### Maintenance\n\n';
  categories.chores.forEach(({ message, hash }) => {
    newChangelog += `- ${message} ([${hash}](https://github.com/raibid-labs/obi-mcp/commit/${hash}))\n`;
  });
  newChangelog += '\n';
}

// Read existing changelog if it exists
let existingChangelog = '';
if (existsSync(CHANGELOG_FILE)) {
  existingChangelog = readFileSync(CHANGELOG_FILE, 'utf8');
  // Remove the header if it exists, we'll add it back
  existingChangelog = existingChangelog.replace(/^# Changelog\n\n/, '');
}

// Create or update CHANGELOG.md
const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;

const fullChangelog = header + newChangelog + existingChangelog;

writeFileSync(CHANGELOG_FILE, fullChangelog);

console.log(`Changelog updated successfully!`);
console.log(`Version ${version} changes:`);
console.log(`  Features: ${categories.features.length}`);
console.log(`  Bug Fixes: ${categories.fixes.length}`);
console.log(`  Documentation: ${categories.docs.length}`);
console.log(`  Other: ${categories.other.length + categories.chores.length + categories.tests.length + categories.refactor.length + categories.performance.length}`);
