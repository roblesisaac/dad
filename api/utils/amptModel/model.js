import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import LabelsMap from './labelsMap';

export default function(collectionName, schemaConfig, globalConfig) {
  const labelsMap = LabelsMap(collectionName, schemaConfig);
  const schema = extractSchema(schemaConfig);

  function buildId(yyyymmdd) {
    const random = Math.random().toString(16).substring(2);
    return `${generateDate(yyyymmdd)}_${random}`;
  }

  function buildSchema_Id() {
    return `${collectionName}:${buildId()}`;
  }

  async function checkForDuplicate(validated, uniqueField) {
    if(!labelsMap.hasLabel(uniqueField)) {
      throw new Error(`Unique field '${uniqueField}' for '${collectionName}' must be labeled in a labelsConfig...`);
    }

    const duplicate = await findOne({ [uniqueField]: validated[uniqueField] });

    if(!!duplicate && duplicate?._id !== validated?._id) {
      throw new Error(`Duplicate value for '${uniqueField}' exists in collection '${collectionName}'`);
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

  async function fetchRef(validated, ref) {
    const refKey = validated[ref];

    return typeof refKey === 'string'
      ? await data.get(refKey)
      : ref;
  }

  async function find(filter, options) {
    if(typeof filter === 'string') {
      return await data.get(filter, options);
    };

    if(!isObject(filter)) {
      throw new Error('Filter must be an object or string');
    };

    const { labelNumber, labelValue } = labelsMap.getArgumentsForGetByLabel(filter);
    const foundResponse = await data.getByLabel(labelNumber, labelValue, options);
    const { items: foundItems, lastKey, next } = foundResponse;
    const validatedItems = [];

    for(const foundItem of foundItems) {
      const { validated: validatedFound, refs, skipped } = await validate(foundItem.value, 'get');

      if(refs.length) {
        for(const ref of refs) {
          validatedFound[ref] = await fetchRef(validatedFound, ref)
        }
      }
      
      validatedItems.push({ _id: foundItem.key, ...validatedFound });
    }

    return { items: validatedItems, lastKey, next };
  }

  async function findOne(filter) {
    if(typeof filter === 'string') {
      const foundItem = await data.get(filter);

      return foundItem 
      ? {
        _id: filter,
        ...foundItem
      } 
      : null;
    }

    const response = await find(filter, { limit: 1 });
    return response?.items?.[0];
  }

  function isObject(value) {
    return typeof value === 'object' && !Array.isArray(value);
  }

  async function save(value) {
    const { validated, uniqueFieldsToCheck } = await validate(value, 'set');

    for(const uniqueField of uniqueFieldsToCheck) {
      await checkForDuplicate(validated, uniqueField);
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
      throw new Error(`No item found with filter '${JSON.stringify(filter)}`);
    }

    const { validated:validatedUpdate, uniqueFieldsToCheck, skipped } = await validate({ ...existingItem, ...updates });

    for(const uniqueField of uniqueFieldsToCheck) {
      await checkForDuplicate({ _id: existingItem._id, ...validatedUpdate }, uniqueField);
    }

    const createdLabels = await labelsMap.createLabelKeys(validatedUpdate, skipped);

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
        return {
          removed: await data.remove(filter)
        }
      }

      const { _id } = await findOne(filter) || {};

      if(!_id) {
        throw new Error(`Item not found when trying to perform erase in collection '${collectionName}' for filter '${JSON.stringify(filter)}'`);
      }

      const isRemoved = await data.remove(_id);
      
      return {
        removed: isRemoved
      }
    }
  };
};