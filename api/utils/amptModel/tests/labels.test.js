import { describe, test, expect } from 'vitest';
import LabelsMap from '../labelsMap';

describe('labelsMap', () => {
  const collectionName = 'testcollection';

  const labelsConfig = {
    label1: 'name',
    label2: ({ item }) => `name length is ${item.name.length}`,
    label3: {
      name: 'user_details',
      concat: ['name', 'age'],
    },
    label4: 5
  };

  const labelsMap = LabelsMap(collectionName, labelsConfig);

  const testItem = {
    name: 'John  ',
    age: '20'
  };

  test('labelsMap.createLabelKey works', async () => {
    const label1Key = await labelsMap.createLabelKey('name', testItem);
    const label2Key = await labelsMap.createLabelKey('label2', testItem);
    const label3Key = await labelsMap.createLabelKey('user_details', testItem);
    const label4Key = await labelsMap.createLabelKey('5', testItem);
  
    expect(label1Key).toBe(`${collectionName}:name_${testItem.name}`);
    expect(label2Key).toBe(`${collectionName}:label2_name length is ${testItem.name.length}`);
    expect(label3Key).toBe(`${collectionName}:user_details_${testItem.name}${testItem.age}`);
    expect(label4Key).toBe(`${collectionName}:5`);
  });
  
  test('labelsMap.createLabelKeys works', async() => {
    const createdLabels = await labelsMap.createLabelKeys(testItem);
    
    expect(createdLabels.label1).toBe(`${collectionName}:name_${testItem.name}`);
    expect(createdLabels.label2).toBe(`${collectionName}:label2_name length is ${testItem.name.length}`);
    expect(createdLabels.label3).toBe(`${collectionName}:user_details_${testItem.name}${testItem.age}`);
    expect(createdLabels.label4).toBe(`${collectionName}:5`);
  });
})