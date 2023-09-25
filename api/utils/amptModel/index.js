import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import LabelMap from './labelMap';

const amptModel = function(collectionName, schema, labelMapSchema) {
  const labelMap = LabelMap(collectionName, labelMapSchema);
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

  return {
    validate,
    labelMap,
    save: async function (value, props) {
      const { validated, uniqueFieldsToCheck } = await validate(value, props);
      const labels = {} // labelMap.buildLabels(validated);

      if (!validated) {
        throw new Error("Validation failed");
      }

      if(uniqueFieldsToCheck) {
        // for(const uniqueField of uniqueFieldsToCheck) {
        //   const uniqueFieldExists = await LabelMap.find(uniqueFieldsToCheck, uniqueField);
        // }
      }

      const _id = value._id || buildSchema_Id();
      const response = await data.set(_id, { ...validated, _id }, { ...labels });

      await data.remove(_id);
      
      return response;
    },
    find: async (filter, options) => {
      const { _id } = siftOut(filter);

      return await data.get(`${collectionName}:${key}`, options);
    },
    remove: async (filter) => { 
      if(typeof filter === 'string') {
        return await data.remove(filter);
      }

      const itemToRemove = await labelMap.find(filter);
    }
  };
};

export default amptModel;