import { describe, test, expect } from 'vitest';
import validate from '../validator';

describe('validate', () => {
  test('validate object exists', () => {
    expect(typeof validate).toBe('object');
  });
  
  test('validate.init function exists', () => {
    expect(typeof validate.init).toBe('function');
  });
  
  test('validate.build function exists', () => {
    expect(typeof validate.build).toBe('function');
  });

  test('validate.init function returns an object', () => {
    expect(typeof validate.init()).toBe('object');
  });
  
  test('validation forSave works', async () => {
    const schema = {
      username: String
    };

    const globalFormatting = {
      username: (value) => value.toLowerCase()
    };

    const validator = validate.build('testCollection', schema, globalFormatting);

    const result = await validator.forSave({ username: 'XXXX' });

    expect(result).toHaveProperty('keyGen');
  });

  test('validation forUpdate works', async () => {  
    const schema = {
      _id: {
        value: (_, { req }) => {
          return req?.params?.id;
        }
      },
      password: String,
      email: {
        value: String,
        default: 'N/A',
        required: true
      },
      username: {
        type: String,
        // unique: true
      },
      label1: 'username'
    };

    const globalFormatting = {
      username: (value) => value.toLowerCase()
    };

    const validator = validate.build('testCollection', schema, globalFormatting);

    const newUser = {
      username: 'testUser',
      password: 'password',
      email: 'XXXXXXXXXXXXX'
    }

    const result = await validator.forUpdate(newUser);

    expect(result).toHaveProperty('validated');
  })
});