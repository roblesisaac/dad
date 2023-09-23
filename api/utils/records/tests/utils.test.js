import { test, expect } from 'vitest';
import { isMeta, siftLabels, siftOutLabelAndFetch } from '../utils';

test('isMeta function exists', () => {
  expect(typeof isMeta).toBe('function');
});

test('siftLabels function exists', () => {
  expect(typeof siftLabels).toBe('function');
});

test('siftOutLabelAndFetch function exists', () => {
  expect(typeof siftOutLabelAndFetch).toBe('function');
});