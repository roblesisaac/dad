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

  const labelMap = {
    label1: 'name',
    label2: item => `${item.name.length}`,
    label3: {
      name: 'user_details',
      concat: ['name', 'age'],
    }
  };

  const TestModel = amptModel('testcollection', schema, labelMap);

  const testItem = {
    name: 'john',
    age: '20'
  };

  test('amptModel', async () => {
    expect(amptModel).toBeDefined();
  });

  // test('ampModel.save works', async () => {
  //   const testProps = { req: { user: { role: 'admin' } } };
  //   const response = await TestModel.save(testItem, testProps);

  //   expect(response._id).toMatch(/^testcollection/);
  // }, 10000);

  test('amptModel.labelMap is defined', () => {
    expect(TestModel.labelMap).toBeDefined();
  });

  test('amptModel.labelMap.getLabelKey works', async () => {
    const url = 'testcollection';
    const label1Key = await TestModel.labelMap.getLabelKey('name', testItem);
    const label2Key = await TestModel.labelMap.getLabelKey('label2', testItem);
    const label3Key = await TestModel.labelMap.getLabelKey('user_details', testItem);

    expect(label1Key).toBe(`${url}:name_${testItem.name}`);
    expect(label2Key).toBe(`${url}:label2_${testItem.name.length}`);
    expect(label3Key).toBe(`${url}:user_details_${testItem.name}${testItem.age}`);
  });

  test('amptModel.labelMap.find works', async () => {
    const label3Key = await TestModel.labelMap.find({ user_details: 'jo'});

    console.log(label3Key);

    expect(label3Key).toBeDefined();
  }, 1000*10);

});