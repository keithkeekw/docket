import { describe, expect, it } from 'vitest';
import { formatEstimate } from './estimate';

describe('formatEstimate', () => {
  it('formats minutes below an hour', () => {
    expect(formatEstimate(15)).toBe('15m');
    expect(formatEstimate(30)).toBe('30m');
    expect(formatEstimate(59)).toBe('59m');
  });

  it('formats whole hours', () => {
    expect(formatEstimate(60)).toBe('1h');
    expect(formatEstimate(120)).toBe('2h');
  });

  it('formats mixed hours and minutes', () => {
    expect(formatEstimate(90)).toBe('1h 30m');
    expect(formatEstimate(75)).toBe('1h 15m');
  });

  it('returns null for empty or invalid values', () => {
    expect(formatEstimate(null)).toBeNull();
    expect(formatEstimate(undefined)).toBeNull();
    expect(formatEstimate(0)).toBeNull();
    expect(formatEstimate(-10)).toBeNull();
    expect(formatEstimate(Number.NaN)).toBeNull();
  });
});
