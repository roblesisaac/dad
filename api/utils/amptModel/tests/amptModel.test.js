import { describe, test, expect  } from 'vitest';
import amptModel from '../index';

describe('amptModels', () => {
  const schema = {      
    name: String,
    age: Number,
    role: {
      type: String,
      computed: (_, { req }) => req.user.role,
      enum: ['user', 'admin']
    }
  };

  const labelsConfig = {
    label1: 'name',
    label2: ({ item }) => `${item.name.length}`,
    label3: {
      name: 'user_details',
      concat: ['name', 'age'],
    },
    label4: 5
  };

  const TestModel = amptModel('testcollection', schema, labelsConfig);

  const testItem = {
    name: 'john',
    age: '20'
  };

  test('amptModel', async () => {
    expect(amptModel).toBeDefined();
  });

  test('ampModel.save works', async () => {
    const testProps = { req: { user: { role: 'admin' } } };
    const { _id, writtenLabels } = await TestModel.save(testItem, testProps);

    console.log({writtenLabels})

    expect(_id).toMatch(/^testcollection/);
  }, 10000);

  test('amptModel.labelsMap to be defined', async () => {
    const writtenLabels = await TestModel.labelsMap.writeLabelKeys(testItem);

    expect(writtenLabels).toBeDefined();
  });

  test('amptModel.labelsMap.writeLabelKey works', async () => {
    const url = 'testcollection';
    const label1Key = await TestModel.labelsMap.writeLabelKey('name', testItem);
    const label2Key = await TestModel.labelsMap.writeLabelKey('label2', testItem);
    const label3Key = await TestModel.labelsMap.writeLabelKey('user_details', testItem);

    expect(label1Key).toBe(`${url}:name_${testItem.name}`);
    expect(label2Key).toBe(`${url}:label2_${testItem.name.length}`);
    expect(label3Key).toBe(`${url}:user_details_${testItem.name}${testItem.age}`);
  });

  test('amptModel.labelsMap.writeLabelKeys works', async() => {
    TestModel.labelsMap.writeLabelKeys(testItem);

    expect(TestModel.labelsMap.writeLabelKeys).toBeDefined();
  });

  test('amptModel.find works', async () => {
    const label3Key = await TestModel.find({ user_details: 'jo'});

    console.log(label3Key);

    expect(label3Key).toBeDefined();
  }, 1000*10);

});