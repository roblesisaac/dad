import { describe, test, expect  } from 'vitest';
import amptModel from '../index';

describe('amptModels', () => {
  const schema = {      
    name: {
      type: String,
      unique: true,
      strict: true
    },
    age: Number,
    role: {
      type: String,
      computed: (_, { req }) => req?.user?.role,
      default: 'user',
      enum: ['user', 'admin']
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
    name: 'John ',
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

  test('amptModel.labelsMap.createLabelKey works', async () => {
    const url = 'testcollection';
    const label1Key = await TestModel.labelsMap.createLabelKey('name', testItem);
    const label2Key = await TestModel.labelsMap.createLabelKey('label2', testItem);
    const label3Key = await TestModel.labelsMap.createLabelKey('user_details', testItem);

    expect(label1Key).toBe(`${url}:name_${testItem.name}`);
    expect(label2Key).toBe(`${url}:label2_name length is ${testItem.name.length}`);
    expect(label3Key).toBe(`${url}:user_details_${testItem.name}${testItem.age}`);
  });

  test('amptModel.labelsMap.createLabelKeys works', async() => {
    const { validated } = await TestModel.validate(testItem);
    const createdLabels = await TestModel.labelsMap.createLabelKeys(validated);

    console.log({ createdLabels });
    expect(createdLabels).toBeDefined();
  });

  test('ampModel.save works', async () => {
    const testProps = { req: { user: { role: 'admin' } } };
    const { _id, ...rest } = await TestModel.save(testItem, testProps);

    expect(_id).toMatch(/^testcollection/);
  }, 10000);

  test('amptModel.find works', async () => {
    const label3Key = await TestModel.find({ user_details: 'jo'});

    console.log({ label3Key });

    expect(label3Key).toBeDefined();
  }, 1000*10);

});