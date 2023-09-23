import { describe, test, expect  } from 'vitest';
import amptModel from '../index';

describe('amptModels', () => {
  test('amptModel', async () => {
    expect(amptModel).toBeDefined();
  });

  test('ampModel.save works', async () => {
    const schema = {      
      name: String,
      age: Number,
      role: {
        type: String,
        computed: (_, { req }) => req.user.role,
        enum: ['user', 'admin']
      }
    };

    const labels = {
      label1: 'name'
    };

    const TestModel = amptModel('testcollection', schema, labels);

    const testProps = { req: { user: { role: 'admin' } } };
    const response = await TestModel.save({ name: 'test' }, testProps);

    console.log(response);
    
    expect(response._id).toMatch(/^testcollection/);

  }, 10000);

});