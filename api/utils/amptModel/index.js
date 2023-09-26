import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import LabelsMap from './labelsMap';

const amptModel = function(collectionName, schema, labelsConfig) {
  const labelsMap = LabelsMap(collectionName, labelsConfig);
  const validate = async (dataToValidate, props) => {
    return await validator(schema,dataToValidate, props);
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
        // for(const uniqueField of uniqueFieldsToCheck) {
        //   const uniqueFieldExists = await LabelsMap.find(uniqueFieldsToCheck, uniqueField);
        // }
      }


      const writtenLabels = await labelsMap.writeLabelKeys(validated);
      const _id = value._id || buildSchema_Id();
      return { _id, validated, writtenLabels }
      // const response = await data.set(_id, { ...validated, _id }, { ...writtenLabels });

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