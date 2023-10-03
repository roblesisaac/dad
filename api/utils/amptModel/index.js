import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import LabelsMap from './labelsMap';

const amptModel = function(collectionName, schemaConfig, globalConfig) {
  const labelsMap = LabelsMap(collectionName, schemaConfig);
  const schema = extractSchema(schemaConfig);

  function buildId(yyyymmdd) {
    const random = Math.random().toString(16).substring(2);
    return `${generateDate(yyyymmdd)}_${random}`;
  }

  function buildSchema_Id() {
    return `${collectionName}:${buildId()}`;
  }

  async function checkForDuplicates(uniqueFieldsToCheck, validated) {
    for(const uniqueField of uniqueFieldsToCheck) {
          
      if(!labelsMap.hasLabel(uniqueField)) {
        throw new Error(`Unique field '${uniqueField}' for '${collectionName}' must be labeled in a labelsConfig...`);
      }

      const duplicate = await findOne({ [uniqueField]: validated[uniqueField] });

      if(validated._id === duplicate?._id) {
        continue;
      }

      if(!!duplicate) {
        throw new Error(`Duplicate value for '${uniqueField}' exists in collection '${collectionName}'`);
      }
    }
  }

  function extractSchema(schemaConfig) {
    const schema = {};

    for(const schemaKey in schemaConfig) {
      if(labelsMap.isLabel(schemaKey)) {
        continue;
      }

      schema[schemaKey] = schemaConfig[schemaKey];
    }

    return schema;
  }

  async function find(filter, options) {
    if(typeof filter === 'string') {
      return await data.get(filter, options);
    };

    if(!isObject(filter)) {
      throw new Error('Filter must be an object');
    };

    const { labelNumber, labelValue } = labelsMap.getArgumentsForGetByLabel(filter);
    const { items: foundItems, lastKey, next } = await data.getByLabel(labelNumber, labelValue);
    const validatedItems = [];

    for(const foundItem of foundItems) {
      const { validated: validatedFound } = await validate(foundItem.value, 'get');
      validatedItems.push({ _id: foundItem.key, ...validatedFound });
    }

    return { items: validatedItems, lastKey, next };
  }

  async function findOne(filter) {
    const response = await find(filter, { limit: 1 });
    return response?.items?.[0];
  }

  function isObject(value) {
    return typeof value === 'object' && !Array.isArray(value);
  }

  async function save(value) {
    const { validated, uniqueFieldsToCheck } = await validate(value, 'set');

    if (!validated) {
      throw new Error('Validation failed');
    }

    if(uniqueFieldsToCheck.length) {
      await checkForDuplicates(uniqueFieldsToCheck, validated);
    }

    const createdLabels = await labelsMap.createLabelKeys(validated);
    const _id = value._id || buildSchema_Id();
    
    const saved = await data.set(_id, validated, { ...createdLabels });
    const { validated: validatedSaved } = await validate(saved, 'get');

    return { _id, ...validatedSaved };
  }

  async function update(filter, updates) {
    const existingItem = await findOne(filter);

    if(!existingItem) {
      throw new Error('Item not found');
    }

    const { validated:validatedUpdate, uniqueFieldsToCheck } = await validate({ ...existingItem, ...updates });

    if(uniqueFieldsToCheck.length) {
      await checkForDuplicates(uniqueFieldsToCheck, { _id: existingItem._id, ...validatedUpdate });
    }

    const createdLabels = await labelsMap.createLabelKeys(validatedUpdate);

    const updated = await data.set(existingItem._id,
      validatedUpdate, 
      createdLabels
    );

    const withGetters = await validate({ ...existingItem, ...updated }, 'get');

    return { _id: existingItem._id, ...withGetters.validated };
  }

  async function validate(dataToValidate, action) {
    return await validator(schema, dataToValidate, { globalConfig, action });
  }

  return {
    validate,
    labelsMap,
    save,
    find,
    findOne,
    update,
    erase: async function(filter) { 
      if(typeof filter === 'string') {
        return await data.remove(filter);
      }

      const { _id } = await findOne(filter);

      if(!_id) {
        throw new Error(`Item not found when trying to perfomr erase in collection '${collectionName}: `);
      }

      const isRemoved = await data.remove(_id);
      
      return {
        removed: isRemoved
      }
    }
  };
};

export default amptModel;