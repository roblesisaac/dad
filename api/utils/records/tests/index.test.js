import { test, expect } from 'vitest';
import Record from '../records';
import Validator from '../validator';

test('exports Validator', () => {
  expect(Validator).toBeDefined();
});

test('exports default Record', () => {
  expect(Record).toBeDefined();
});