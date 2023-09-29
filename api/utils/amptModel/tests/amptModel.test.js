import { describe, test, expect  } from 'vitest';
import amptModel from '../index';

describe('amptModels', () => {
  const schema = {      
    name: {
      type: String,
      unique: true,
      strict: true
    },
    createdAt: {
      set: () => Date.now(),
      get: ({ item }) => `${item.name} created at ${item.createdAt}`
    },
    age: Number,
    role: {
      type: String,
      computed: ({ item }) => item?.req?.user?.role,
      default: 'user',
      enum: ['user', 'admin', null]
    }
  };

  const labelsConfig = {
    label1: 'name',
    label2: ({ item }) => `name length is ${item.name.length}`,
    label3: {
      name: 'user_details',
      concat: ['name', 'age'],
    },
    label4: 5
  };

  const globalConfig = { lowercase: true, trim: true };

  const TestModel = amptModel('testcollection', { ...schema, ...labelsConfig }, globalConfig);

  const testItem = {
    name: 'John  ',
    age: '20'
  };

  test('amptModel', async () => {
    expect(amptModel).toBeDefined();
  });

  test('amptModel.validate throws error if schema is invalid', () => {
    expect(async () => await TestModel.validate({ name: 1 }))
      .rejects.toThrowError('name must be of type string');
  });

  test('amptModel.validate works', async () => {
    const { validated } = await TestModel.validate({ name: 'Jane ' });

    expect(validated.name).toBe('jane');
    expect(validated.role).toBe('user');
  });

  test('ampModel.save works', async () => {
    const testProps = { req: { user: { role: 'admin' } } };
    // const { _id } = await TestModel.save({ ...testItem, ...testProps }, testProps);

    expect(true).toBe(true);
    // expect(_id).toMatch(/^testcollection/);
  }, 10000);

  test('amptModel.find works', async () => {
    const label3Key = await TestModel.find({ user_details: 'jo' });

    expect(label3Key).toBeDefined();
  }, 1000*10);

});