import { describe, expect, it } from 'vitest';
import { compareRecent, includesSearchText, normalizeSearchText } from './searchText';

describe('searchText', () => {
  it('normalizes and searches mixed values case-insensitively', () => {
    expect(normalizeSearchText('  React 개발자  ')).toBe('react 개발자');
    expect(includesSearchText(['Django', null, 'React 개발자'], ' react ')).toBe(true);
    expect(includesSearchText(['Django'], '')).toBe(true);
  });

  it('sorts valid timestamps newest first and treats invalid values as zero', () => {
    expect(compareRecent('2026-07-11T00:00:00Z', '2026-07-12T00:00:00Z')).toBeGreaterThan(0);
    expect(compareRecent('invalid', undefined)).toBe(0);
  });
});
