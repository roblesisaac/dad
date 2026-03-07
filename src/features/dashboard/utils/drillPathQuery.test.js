import { describe, expect, test } from 'vitest';
import {
  decodeDrillPath,
  encodeDrillPath,
  sameDrillPath
} from './drillPathQuery.js';

describe('drillPathQuery', () => {
  test('round-trips non-empty drill paths', () => {
    const path = ['food and drink', '2026 jan', 'all transactions'];
    const encoded = encodeDrillPath(path);
    const decoded = decodeDrillPath(encoded);

    expect(encoded).toBeTruthy();
    expect(decoded).toEqual(path);
  });

  test('returns empty values for empty input', () => {
    expect(encodeDrillPath([])).toBe('');
    expect(decodeDrillPath('')).toEqual([]);
  });

  test('trims and normalizes decoded segments', () => {
    const encoded = encodeDrillPath(['  food  ', '', '2026 jan']);
    expect(decodeDrillPath(encoded)).toEqual(['food', '2026 jan']);
  });

  test('guards against invalid encoded payloads', () => {
    expect(decodeDrillPath('this-is-not-base64')).toEqual([]);
  });

  test('compares drill paths by normalized values', () => {
    expect(sameDrillPath([' food ', '2026 jan'], ['food', '2026 jan'])).toBe(true);
    expect(sameDrillPath(['food'], ['food', '2026 jan'])).toBe(false);
  });
});
