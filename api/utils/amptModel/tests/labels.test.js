import { describe, test, expect } from 'vitest';
import LabelsMap from '../labelsMap';

describe('labelsMap', () => {
  const collectionName = 'testcollection';
  const errorMessage = message => `LabelMap Error for collection '${collectionName}': ${message}`;

  const labelsConfig = {
    notALabel: 'normal schema',
    label1: 'name',
    label2: ({ item }) => `the length of the name is ${item.name.length}`,
    label3: {
      name: 'user_details',
      concat: ['name', 'age'],
    },
    label4: 5
  };

  const labelsMap = LabelsMap(collectionName, labelsConfig);

  const testItem = {
    name: 'John',
    age: '20'
  };

  test('labelsMap.getLabelNumber works', async () => {
    const label1Number = labelsMap.getLabelNumber('name');
    const label2Number = labelsMap.getLabelNumber('label2');
    const label3Number = labelsMap.getLabelNumber('user_details');
    
    expect(label1Number).toBe('label1');
    expect(label2Number).toBe('label2');
    expect(label3Number).toBe('label3');
  });

  test('labelsMap.hasLabel works', async () => {
    const hasLabel1 = labelsMap.hasLabel('name');
    const hasLabel2 = labelsMap.hasLabel('label2');
    const hasLabel5 = labelsMap.hasLabel('random_label');
    
    expect(hasLabel1).toBe(true);
    expect(hasLabel2).toBe(true);
    expect(hasLabel5).toBe(false);
  });

  test('labelsMap.isLabel works', async () => {
    const isValidLabel1 = labelsMap.isLabel('label1');
    const isValidLabel4 = labelsMap.isLabel('label4');
    const isValidLabel5 = labelsMap.isLabel('random_label');
    
    expect(isValidLabel1).toBe(true);
    expect(isValidLabel4).toBe(true);
    expect(isValidLabel5).toBe(false);
  });

  test('labelsMap concat must be an array', async () => {
    const concatLabelConstruct = {
      label1: {
        concat: 'name, age'
      }
    };
    
    const concatLabelMap = LabelsMap(collectionName, concatLabelConstruct);

    expect(async () => await concatLabelMap.createLabelKeys({ name: 'John' }))
      .rejects.toThrowError(errorMessage('concat must be an array'));
  });

  test('labelsMap concat keys must be valid', async () => {
    const concatLabelConstruct = {
      label1: {
        name: 'testName',
        concat: ['name', 'age', 'address']
      }
    };
    
    const concatLabelMap = LabelsMap(collectionName, concatLabelConstruct);

    expect(async () => await concatLabelMap.createLabelKeys({ name: 'John' }))
    .rejects.toThrowError(errorMessage('some concat keys are missing'));
  });

  test('labelsMap computed catches errors for named label', async () => {
    const labelConstruct = {
      label1: {
        name: 'testName',
        computed: function () {
          return undefinedVarName
        }
      }
    };
    
    const concatLabelMap = LabelsMap(collectionName, labelConstruct);

    expect(async () => await concatLabelMap.createLabelKeys({ name: 'John' }))
    .rejects.toThrowError(errorMessage('Error in testName : undefinedVarName is not defined'));
  });

  test('labelsMap computed catches errors for unamed label', async () => {
    const labelConstruct = {
      label1: function () {
        return undefinedVarName
      }
    };
    
    const concatLabelMap = LabelsMap(collectionName, labelConstruct);

    expect(
      async () => await concatLabelMap.createLabelKeys({ name: 'John' })
    ).rejects
      .toThrowError(errorMessage('Error in label1 : undefinedVarName is not defined'));
  });

  test('labelsMap non computed works', async () => {
    const labelConstruct = {
      label1: {
        name: 'testName',
        value: 1
      }
    };
    
    const concatLabelMap = LabelsMap(collectionName, labelConstruct);
    const createdLabels = await concatLabelMap.createLabelKeys({ name: 'John' });

    expect(createdLabels.label1).toBe(`${collectionName}:testName_1`);
  });

  test('labelsMap skipped works', async () => {
    const createdLabels = await labelsMap.createLabelKeys(testItem, ['name']);
    
    expect(createdLabels.label1).toBe(undefined);
    expect(createdLabels.label2).toBe(`${collectionName}:label2_the length of the name is ${testItem.name.length}`);
    expect(createdLabels.label3).toBe(`${collectionName}:user_details_${testItem.name}${testItem.age}`);
    expect(createdLabels.label4).toBe(`${collectionName}:5`);
  });

  test('labelsMap throws error if no mapped label found', async () => {
    expect(async () => labelsMap.getArgumentsForGetByLabel({ firstName: 'XXXX' }))
      .rejects.toThrowError(errorMessage(`No mapped label found for filter '{"firstName":"XXXX"}'`));
  });

  test('labelsMap throws error if no mapped label found', async () => {
    const { labelNumber, labelValue } = labelsMap.getArgumentsForGetByLabel({ name: '' });

    expect(labelNumber).toBe('label1');
    expect(labelValue).toBe(`${collectionName}:name_*`);
  });
  
  test('labelsMap.createLabelKeys works', async() => {
    const createdLabels = await labelsMap.createLabelKeys(testItem);
    
    expect(createdLabels.label1).toBe(`${collectionName}:name_${testItem.name}`);
    expect(createdLabels.label2).toBe(`${collectionName}:label2_the length of the name is ${testItem.name.length}`);
    expect(createdLabels.label3).toBe(`${collectionName}:user_details_${testItem.name}${testItem.age}`);
    expect(createdLabels.label4).toBe(`${collectionName}:5`);
  });

  test('labelsMap.getArgumentsForGetByLabel works', () => {
    const args = labelsMap.getArgumentsForGetByLabel({ name: testItem.name });

    expect(args).toEqual({
      labelNumber: 'label1',
      labelValue: `${collectionName}:${'name'}_${testItem.name}*`,
    });
  });

});