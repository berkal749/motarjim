import { describe, it, expect } from 'vitest';
import { formatError, formatValidationIssues } from '../../services/error-formatter.js';

describe('formatError', () => {
  it('formats a generic error', () => {
    const result = formatError(new Error('Something went wrong'));
    expect(result.title).toBe('Something went wrong');
    expect(result.details).toEqual([]);
  });

  it('detects unsupported CSS properties', () => {
    const result = formatError(new Error('backdrop-filter is not supported'));
    expect(result.title).toBe('Unsupported CSS property: backdrop-filter');
    expect(result.details).toContain('Supported alternatives:');
    expect(result.details).toContain('  - opacity');
  });

  it('formats file not found errors', () => {
    const result = formatError(new Error('File not found: /path/to/file'));
    expect(result.title).toBe('File not found');
    expect(result.suggestion).toBeTruthy();
  });

  it('formats unknown target errors', () => {
    const result = formatError(new Error('Unknown target "react"'));
    expect(result.title).toBe('Invalid target platform');
    expect(result.details.some(d => d.includes('react'))).toBe(true);
  });
});

describe('formatValidationIssues', () => {
  it('formats issues with icons', () => {
    const issues = [
      { type: 'error' as const, message: 'File not found', file: 'test.html', line: 1 },
      { type: 'warning' as const, message: 'Unsupported property', suggestion: 'Use opacity' },
      { type: 'info' as const, message: 'Missing DOCTYPE' },
    ];

    const output = formatValidationIssues(issues);
    expect(output).toContain('X');
    expect(output).toContain('!');
    expect(output).toContain('i');
    expect(output).toContain('test.html:1');
    expect(output).toContain('Use opacity');
  });
});
