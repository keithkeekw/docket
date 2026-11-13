import { describe, expect, it } from 'vitest';
import { compareVersions, isUpdateTag, normalizeVersion } from './updates';

describe('compareVersions', () => {
  it('compares numeric parts', () => {
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('v2.0.0', '1.99.99')).toBe(1);
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
  });

  it('handles different lengths and pre-release suffixes', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.0-beta.1', '1.2.0')).toBe(0);
  });
});

describe('normalizeVersion', () => {
  it('drops a leading v', () => {
    expect(normalizeVersion(' v1.2.3 ')).toBe('1.2.3');
  });
});

describe('isUpdateTag', () => {
  it('accepts release-looking tags only', () => {
    expect(isUpdateTag('v1.2.3')).toBe(true);
    expect(isUpdateTag('1.2.3')).toBe(true);
    expect(isUpdateTag('master')).toBe(false);
    expect(isUpdateTag('v1.2')).toBe(false);
    expect(isUpdateTag('v1.2.3-rc.1')).toBe(false);
  });
});
