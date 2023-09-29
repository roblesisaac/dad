import { describe, test, expect } from 'vitest';
import validate from '../validate';

describe('validate', () => {
  test('validate returns an async function', () => {
    expect(validate).toBeInstanceOf(Function);
  });

  test('validate without data to validate returns a function', async () => {
    expect(await validate({username: String})).toBeInstanceOf(Function);
  });

  test('validate without data to validate returns a usable function', async () => {
    const usernameValidator = await validate({ username: String });
    const { validated } = await usernameValidator({ username: 'testusername' });
  
    expect(validated.username).toBe('testusername');
  });

  test('simple validate(String, 1) return validated string', async () => {
    const { validated } = await validate(String, 1);

    expect(validated).toBe('1');
  });

  test('simple validate({ type: String, lowercase }) returns validated', async () => {
    const { validated } = await validate({ type: String, lowercase: true }, 'TEST');

    expect(validated).toBe('test');
  });

  test('wild * works as expected', async () => {
    const { validated } = await validate({ name: '*' }, { name: 'TeSt'});
    expect(validated).toEqual({ name: 'TeSt'});
  });

  test('nested array throws error if not an array', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ type: String, enum: ['admin', 'user'] }],
    };

    await expect(validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: 'admin',
    })).rejects.toThrowError('roles must be an array');
  
  })

  test('nested array of simple wilds validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admin'],
    });

    expect(validated).toBeDefined();  
  });

  test('nested array of simple strings validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [String],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admin'],
    });

    expect(validated).toBeDefined();  
  });

  test('nested array of complex strings validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ type: String, enum: ['admin', 'user'] }],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admin'],
    });

    expect(validated).toBeDefined();  
  });

  test('nested array of complex strings throws error', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ type: String, enum: ['admin', 'user'] }],
    };

    const testItem = {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admins'],
    };

    expect(async () => await validate(testSchema, testItem)).rejects.toThrowError('admins must be one of admin,user');  
  });

  test('nested array of objects validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ 
        name: String,
        permissions: [{ type: String, enum: ['read', 'write'] }]
       }],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: [{
        name: 'admin',
        permissions: ['read'],
      }],
    });

    expect(validated).toBeDefined();  
  });

  test('nested object throws error', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        name: String,
        permissions: [{ type: String, enum: ['read', 'write'] }],
      },
    };

    await expect(validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: 'admin',
    })).rejects.toThrowError('roles must be an object');
  
  
  });

  test('nested objects validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        name: String,
        permissions: [{ type: String, enum: ['read', 'write'] }],
      },
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: {
        name: 'admin',
        permissions: ['read'],
      },
    });

    expect(validated).toBeDefined();  
  
  });

  test('globalConfig works', async () => {
    const testSchema = { firstName: String, lastName: String };
    const globalConfig = { lowercase: true, trim: true };
    const testItem = { firstName: 'John', lastName: 'Doe ' };
    const { validated } = await validate(testSchema, testItem, { globalConfig });

    expect(validated.firstName).toBe('john');
    expect(validated.lastName).toBe('doe');  
  });

  test('setting default for undefined works', async () => {
    const testSchema = { username: { type: String, default: 'defaultUsername' } };
    const { validated } = await validate(testSchema, { username: undefined });

    expect(validated.username).toBe('defaultUsername');
  });

  test('setting default for null works', async () => {
    const testSchema = { username: { type: String, default: 'defaultUsername' } };
    const { validated } = await validate(testSchema, { username: null });

    expect(validated.username).toBe('defaultUsername');
  });

  test('missing required field throws error', async () => {
    const testSchema = { username: String, password: { type: String, required: true } };
    const testItem = { username: 'XXXX'  };
    
    expect(async () => validate(testSchema, testItem)).rejects.toThrowError('password is required');
  });

  test('having required field returns validated', async () => {
    const testSchema = { username: String, password: { type: String, required: true } };
    const { validated } = await validate(testSchema, { username: 'XXXX', password: 'XXXX'  });
    
    expect(validated).toBeDefined();
  });

  test('valid type works', async () => {
    const testSchema = { username: String };  
    const testItem = { username: 'testuser' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated).toEqual({ username: 'testuser' });
  });

  test('strict invalid type throws error', async () => {
    const testSchema = { username: { type: String, strict: true } };
    const testItem = { username: 123 };

    expect(async () => await validate(testSchema, testItem)).rejects.toThrowError('username must be of type string');
  });

  test('not string invalid type corrects', async () => {
    const testSchema = { username: String };
    const testItem = { username: 123 };
    const { validated } = await validate(testSchema, testItem);

    expect(validated.username).toBe('123')
  });

  test('valid enum works', async () => {
    const testSchema = { username: { type: String, enum: ['testuser', 'testuser2'] } };
    const testItem = { username: 'testuser' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated).toBeDefined();
  });

  test('invalid enum throws error', async () => {
    const testSchema = { username: { type: String, enum: ['testuser', 'testuser2'] } };
    const testItem = { username: 'XXXXXXXXX' };

    await expect(validate(testSchema, testItem)).rejects.toThrowError('username must be one of testuser,testuser2');
  });

  test('custom validate works when custom qualifications met', async () => {
    const testSchema = { username: { type: String, validate: (value) => value.length > 3 } };
    const testItem = { username: 'XXXX' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated).toBeDefined();  
  });

  test('custom validate throws error when custom qualifications not met', async () => {
    const testSchema = { username: { type: String, validate: (value) => value.length > 3 } };
    const testItem = { username: 'X' };

    await expect(validate(testSchema, testItem)).rejects.toThrowError('username failed custom validation');
  });

  test('computed values throw error', async () => {
    const testSchema = { username: { type: String, computed: _ => `ampt${values}` } };
    const testItem = { username: 'X' };

    expect(async () => validate(testSchema, testItem)).rejects.toThrowError('username failed computed validation');
  });

  test('computed values work', async () => {
    const testSchema = { username: { type: String, computed: ({ value }) => `ampt${value}` } };
    const testItem = { username: 'XXXX' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('amptXXXX');
  });

  test('computed works', async () => {
    const testSchema = { 
      username: { 
        type: String, 
        computed: ({ item, value }) => `ampt${item.username}${value}` 
      }
    };

    const testItem = { username: 'XXXX' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('amptXXXXXXXX');
  });

  test('getter and setter works', async () => {
    const hash = value => `hashed${value}`;

    const testSchema = { 
      username: {
        type: String,
        lowercase: true,
        trim: true
      },
      userdetails: {
        set: ({ item, value }) => `user details for ${item.username} with '_id:${ item.user?._id }' are ${value}`, 
        get: ({ value }) => `USER_DETAILS: ${value.toUpperCase()} ${Date.now()}`
      },
      computedTest: {
        computed: ({ item }) => `this was computed for ${item.username} at ${Date.now()}`
      },
      currentTime: () => Date.now(),
      createdOn: {
        set: () => Date.now()
      },
      password: {
        set: ({ value }) => hash(value),
        get: ({ value }) => value.replace('hashed', '')
      }
    };

    const testItem = {
      username: 'John doe',
      password: 'secret',
      userdetails: '<users detailed info here>'
    };

    const req = {  user: { _id: 123 } };
    const originalItem = { ...testItem, ...req };
    const { validated: validatedWithSet } = await validate(testSchema, originalItem, { action: 'set' });
    
    // delay 100 ms
    await new Promise(resolve => setTimeout(resolve, 100) );

    const { validated: validatedWithGet } = await validate(testSchema, validatedWithSet, { action: 'get' });
    const { validated: validatedAgain } = await validate(testSchema, validatedWithGet);

    expect(validatedWithSet.createdOn).toBe(validatedWithGet.createdOn);
    expect(validatedWithSet.currentTime).toBeLessThan(validatedWithGet.currentTime);
    expect(validatedWithSet.createdOn).toBe(validatedAgain.createdOn);
  });

  test('rules.min works', async () => {
    const testSchema = { age: { type: Number, min: 18 } };
    const testItem = { age: 19 };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.age).toBe(19);
  });

  test('rules.min throws error when expected', async () => {
    const testSchema = { age: { type: Number, min: 18 } };
    const testItem = { age: 17 };

    expect(async () => await validate(testSchema, testItem)).rejects.toThrowError('age must be at least 18');
  });

  test('rules.max works', async () => {
    const testSchema = { age: { type: Number, max: 100 } };
    const testItem = { age: 80 };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.age).toBe(80);
  });

  test('rules.max throws error when expected', async () => {
    const testSchema = { age: { type: Number, max: 100 } };
    const testItem = { age: 101 };

    expect(async () => await validate(testSchema, testItem)).rejects.toThrowError('age must be at most 100');
  });

  test('rules.minLength works', async () => {
    const testSchema = { username: { type: String, minLength: 3 } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.minLength throws error when expected', async () => {
    const testSchema = { username: { type: String, minLength: 3 } };
    const testItem = { username: 'XX' };

    expect(async () => await validate(testSchema, testItem)).rejects.toThrowError('username must have a minimum length of 3');
  });

  test('rules.maxLength works', async () => {
    const testSchema = { username: { type: String, maxLength: 10 } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.maxLength throws error when expected', async () => {
    const testSchema = { username: { type: String, maxLength: 2 } };
    const testItem = { username: 'test' };

    expect(async () => await validate(testSchema, testItem)).rejects.toThrowError('username must have a maximum length of 2');
  });

  test('rules.trim works', async () => {
    const testSchema = { username: { type: String, trim: true } };
    const testItem = { username: ' test ' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.lowercase works', async () => {
    const testSchema = { username: { type: String, lowercase: true } };
    const testItem = { username: 'TEST' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.uppercase works', async () => {
    const testSchema = { username: { type: String, uppercase: true } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('TEST');
  });

  test('rules.unique returns uniqueInstructions', async () => {
    const testSchema = { username: { type: String, unique: true } };
    const testItem = { username: 'XXXX' };

    const { uniqueFieldsToCheck } = await validate(testSchema, testItem);
    expect(uniqueFieldsToCheck).toBeDefined();
  });

  test('rules.select works', async () => {
    const testSchema = { username: { type: String, select: false } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBeUndefined();
  });

});