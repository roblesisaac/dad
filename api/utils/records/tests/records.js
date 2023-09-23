import { describe, test, expect } from 'vitest';
import Record from '../records';
import { hashPassword } from '../../auth';

describe('Records', async () => {

  test('Record function exists', () => {
    expect(typeof Record).toBe('function');
  });
  
  test('Record function throws error when collectionName is not a string', () => {
    expect(() => Record(123)).toThrowError();
  });

  const TestSchema = {
    userid: {
      value: (_, { req }) => req.user._id
    },
    email: {
      value: String,
      required: true,
      unique: true
    },
    settings: {
      type: String,
      default: 'hideButtons'
    },
    password: async (value) => await hashPassword(value),
    label1: 'email'
  };

  const TestUsers = Record('testusers', TestSchema);

  test('Record function returns an object with methods', () => {    
    expect(TestUsers).toHaveProperty('erase');    
    expect(TestUsers).toHaveProperty('find');
    expect(TestUsers).toHaveProperty('findOne');
    expect(TestUsers).toHaveProperty('get');
    expect(TestUsers).toHaveProperty('remove');
    expect(TestUsers).toHaveProperty('save');
    expect(TestUsers).toHaveProperty('set');
    expect(TestUsers).toHaveProperty('update');
  });

  test('Record.save returns a saved item', async () => {
    const newTestUser = {
      email: 'sample@email.com',
      password: 'XXXXXXXX'
    };
    const testReq = { user: { userid: '12345' } };
  
    const savedTestUser = await TestUsers.save(newTestUser, testReq);

    expect(savedTestUser.email).toBe('sample@email.com');
  }, { timeout: 10000});

  test('Record.save duplicate throws error', async () => {
    const newTestUser = {
      email: 'sample@email.com',
      password: 'XXXXXXXX'
    };
    const testReq = { user: { userid: '12345' } };

    expect(TestUsers.save(newTestUser, testReq)).rejects.toThrowError();  
  }, { timeout: 10000});

  test('Record.findOne works', async () => {
    const filter = {
      email: 'sample@email.com'
    };
  
    const foundUser = await TestUsers.findOne(filter);

    expect(foundUser.email).toBe('sample@email.com');
  }, { timeout: 10000});

  test('Record.update works', async () => {
    const filter = { email: 'sample@email.com' };
    const update = { email: 'sample@emails.com' };
    const testReq = { user: { userid: '12345' } };
    const updatedUser = await TestUsers.update(filter, update, testReq);

    expect(updatedUser.email).toBe('sample@emails.com');
  }, { timeout: 10000});

  test('Record.erase works', async () => {
    const removedUser = await TestUsers.erase({ email: 'sample@email.com'});

    console.log({ removedUser })

    expect(removedUser.erased).toBe(true);
  }, { timeout: 10000 });

});