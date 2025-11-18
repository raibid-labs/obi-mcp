#!/usr/bin/env tsx
/**
 * Demo script to show docker-compose.yml generation
 */

import { composeGenerator } from './src/toolsets/docker/compose-generator.js';

console.log('='.repeat(80));
console.log('OBI Docker Toolset - Docker Compose Generation Demo');
console.log('='.repeat(80));
console.log('');

const pkg = composeGenerator.generateDeploymentPackage({
  network: 'host',
  targetPort: 8080,
  includeCollector: true,
  otlpEndpoint: 'http://otel-collector:4317',
  exportEndpoint: 'http://backend.example.com:4317',
  resources: {
    cpus: '2.0',
    memory: '2g',
  },
});

console.log('Generated Files:\n');

console.log('1. docker-compose.yml');
console.log('-'.repeat(80));
console.log(pkg.composeFile);
console.log('');

console.log('2. otel-config.yaml');
console.log('-'.repeat(80));
console.log(pkg.collectorConfig);
console.log('');

console.log('3. README.md');
console.log('-'.repeat(80));
console.log(pkg.readme);
