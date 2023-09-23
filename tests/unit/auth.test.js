import { expect, test } from 'vitest';

function add(a, b) {
  return a + b;
}

test('adds 1 + 2s to equal 3', () => {
  expect(add(1, 2)).toBe(3)
})