import { describe, test, expect  } from 'vitest';
import amptModel from '../index';

describe('amptModels', () => {
  const createdAt = Date.now();
  const schema = {      
    name: {
      type: String,
      unique: true,
      strict: true
    },
    createdAt: {
      set: () => createdAt,
      get: ({ item }) => `${item.name} who is ${item.age} created at ${item.createdAt}`
    },
    lastLogin: () => Date.now(),
    age: Number,
    role: {
      type: String,
      set: ({ item }) => item?.req?.user?.role,
      default: 'user',
      enum: ['user', 'admin']
    },
    orderId: {
      ref: `orders`
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
  const collectionName = 'testcollection';

  const TestModel = amptModel(collectionName, { ...schema, ...labelsConfig }, globalConfig);

  test('amptModel', async () => {
    expect(amptModel).toBeDefined();
  });

  test('amptModel.validate throws error if schema is invalid', () => {
    expect(async () => await TestModel.validate({ name: 1 }))
      .rejects.toThrowError('name must be of type string');
  });

  test('amptModel.validate works', async () => {
    const { validated } = await TestModel.validate({ name: 'Jane ', orderId: 'order1234' }, 'set');

    expect(validated.name).toBe('jane');
    expect(validated.role).toBe('user');
    expect(validated.orderId).toBe('order1234');
  });

  test('ampModel.save works', async () => {
    const testItem = { name: 'John  ', age: '20', orderId: 'order4567'  };
    const testProps = { req: { user: { role: 'admin' } } };
    const response = await TestModel.save({ ...testItem, ...testProps });

    console.log({ response });

    expect(response._id).toMatch(/^testcollection/);
    expect(response.name).toBe('john');
    expect(response.age).toBe(20);
    expect(response.role).toBe('admin');
  }, 20000);

  test('amptModel.find when the filter is a string works', async () => {
    const responseForFilterString = await TestModel.find('testcollection:*');

    expect(Array.isArray(responseForFilterString.items)).toBe(true);
  }, 1000*10);

  test('amptModel.find works for user_details', async () => {
    const response = await TestModel.find({ user_details: 'jo' });

    expect(response.items[0].name).toBe('john');
  }, 1000*10);

  test('amptModel.find works for name', async () => {
    const response = await TestModel.find({ name: 'john' });

    expect(response.items[0].name).toBe('john');
  }, 1000*10);

  test('amptModel.findOne works for name', async () => {
    const response = await TestModel.findOne({ name: 'john' });

    expect(response.name).toBe('john');
  }, 1000*10);

  test('amptModel.updateWorks', async () => {
    const updated = await TestModel.update({ name: 'john' }, { age: 30 });

    expect(updated.age).toBe(30);
    expect(updated.createdAt).toBe(`john who is 30 created at ${createdAt}`);
  });

  test('amptModel.findOne after update works', async () => {
    const response = await TestModel.findOne({ name: 'john' });

    expect(response.age).toBe(30);
    expect(response.createdAt).toBe(`john who is 30 created at ${createdAt}`);
  });

  test('amptModel.updateWorks again', async () => {
    const updated = await TestModel.update({ name: 'john' }, { age: 31 });

    expect(updated.age).toBe(31);
    expect(updated.createdAt).toBe(`john who is 31 created at ${createdAt}`);
  });

  test('amptModel.findOne after update works again', async () => {
    const response = await TestModel.findOne({ name: 'john' });

    expect(response.age).toBe(31);
    expect(response.createdAt).toBe(`john who is 31 created at ${createdAt}`);
  });

  test('amptModel.save duplicate unique key throws error', async () => {
    expect(async () => await TestModel.save({ name: 'john' }))
      .rejects.toThrowError(`Duplicate value for 'name' exists in collection '${collectionName}'`);
  }, 1000*10);

  test('amptModel.erase works', async () => {
    const response = await TestModel.erase({ name: 'john' });

    expect(response).toEqual({ removed: true });
  });

});