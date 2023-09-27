import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import LabelsMap from './labelsMap';

const amptModel = function(collectionName, schemaConfig, globalConfig) {
  const labelsMap = LabelsMap(collectionName, schemaConfig);
  const schema = extractSchema(schemaConfig);

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

  const validate = async (dataToValidate, props) => {
    return await validator(schema, dataToValidate, props, globalConfig);
  };

  function buildId(yyyymmdd) {
    const random = Math.random().toString(16).substring(2);
    return `${generateDate(yyyymmdd)}_${random}`;
  }

  function buildSchema_Id() {
    return `${collectionName}:${buildId()}`;
  }

  function isSearchingBy_Id(filter) {
    return typeof filter === 'string' && filter.includes(':');
  }

  return {
    validate,
    labelsMap,
    save: async function (value, props) {
      const { validated, uniqueFieldsToCheck } = await validate(value, props);

      if (!validated) {
        throw new Error('Validation failed');
      }

      if(uniqueFieldsToCheck) {
        for(const uniqueField of uniqueFieldsToCheck) {
          
          if(!labelsMap.isLabeled(uniqueField)) {
            throw new Error(`Unique field '${uniqueField}' for '${collectionName}' must be labeled in a labelsConfig...`);
          }

          console.log('check for duplicate:', { [uniqueField] : validated[uniqueField] })
          
          // const duplicate = await this.find({ [uniqueField]: validated[uniqueField] });

          // if(duplicate) {
          //   throw new Error(`Duplicate value for '${uniqueField}'`);
          // }

        }
      }

      const createdLabels = await labelsMap.createLabelKeys(validated);

      const _id = value._id || buildSchema_Id();
      return { _id, validated, createdLabels }
      // const response = await data.set(_id, { ...validated, _id }, { ...createdLabels });

      // await data.remove(_id);
      
      // return response;
    },
    find: async (filter, options) => {
      if(isSearchingBy_Id(filter)) {
        return await data.get(filter, options);
      };

      const { labelNumber, labelValue } = labelsMap.getArgumentsForGetByLabel(filter);

      return { labelNumber, labelValue };
      // return await data.getByLabel(labelNumber, url)
    },
    remove: async (filter) => { 
      if(typeof filter === 'string') {
        return await data.remove(filter);
      }

      const itemToRemove = await labelsMap.find(filter);
    }
  };
};

export default amptModel;