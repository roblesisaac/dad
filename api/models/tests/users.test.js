import { describe, expect, test } from 'vitest';
import Users from '../users';
import { errorCodes, getErrorMessage } from '../../utils/amptModel/errorCodes';

describe('users model', () => {
  test('Users model is defined', () => {
    expect(Users).toBeDefined();
  });

  test('Save new user works', async () => {
    const newUser = await Users.save({
      email: 'testemail@gmail.com',
      password: 'testpassword1.',
      views: []
    });

    expect(newuser._id).toBeDefined();
  }, 1000*40);

  test('Save new user works without password', async () => {
    const newUser = await Users.save({
      email: 'testemails@gmail.com',
      email_verified: true,
      views: []
    });

    expect(newuser._id).toBeDefined();

    const { removed } = await Users.eraseUser('testemails@gmail.com');

    expect(removed).toBe(true);
  }, 1000*20);

  test('Save new user throws error when email is already taken', async () => {
    const newUser = {
      email: 'testemail@gmail.com',
      password: 'testpassword1.',
      views: []
    };

    expect(async () => await Users.save(newUser)).rejects.toThrowError(`Duplicate value for 'email' exists in collection 'users'`);
  }, 1000*20);

  test('Save new user throws error when password is to short', async () => {
    const newUser = {
      email: 'testemails@gmail.com',
      password: 'test',
      views: []
    };

    expect(async () => await Users.save(newUser)).rejects.toThrowError(`Password must be at least 8 characters long`);
  }, 1000*20);

  test('Invalid email throws error', async () => {
    const newUser = {
      email: 'gmail.com',
      password: 'testpassword',
      views: []
    };
    
    try {
      await Users.save(newUser);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.CUSTOM_VALIDATION_ERROR))).toBe(true)
    }    

  }, 1000*20);

  test('Find user works', async () => {
    const user = await Users.findUser('testemail@gmail.com');

    expect(user.email).toBeDefined();
  }, 1000*20);

  test('Auth local user works', async () => {
    await Users.authLocalUser('testemail@gmail.com', 'testpassword1.', function(_, user) {
      expect(user.email).toBe('testemail@gmail.com');
    });
  });

  test('Auth local user throws error when email or password is missing', async () => {
    await Users.authLocalUser(undefined, 'testpassword', function(err) {
      expect(err).toBe(`Missing 'email' or 'password' properties.`);
    });
  });

  test('Auth local user throws error when email doesnt exist', async () => {
    await Users.authLocalUser('email@doesntexist.com', 'testpassword', function(err) {
      expect(err).toBe(`The username or password you provided is incorrect.`);
    });
  });

  test('Auth local user throws error when password is incorrect', async () => {
    await Users.authLocalUser('testemail@gmail.com', 'testpasswords', function(err) {
      expect(err).toBe(`The username or password you provided is incorrect.`);
    });
  });

  test('Update user works', async () => {
    const updatedUser = await Users.updateUser('testemail@gmail.com', { role: 'admin' });

    expect(updatedUser.role).toBe('admin');
  });

  test('Find user after update works', async () => {
    const user = await Users.findUser('testemail@gmail.com');

    expect(user.role).toBe('admin');
  });

  test('Erase user works', async () => {
    const { removed } = await Users.eraseUser('testemail@gmail.com');

    expect(removed).toBe(true);
  });
});