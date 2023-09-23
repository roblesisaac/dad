import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import labelMap from './labelMap';

const amptModel = function(collectionName, schema, labels) {
  const labelMaps = labelMap(schema);
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
    save: async function (value, props) {
      const { validated, uniqueFieldsToCheck } = await validate(value, props);

      if (!validated) {
        throw new Error("Validation failed");
      }

      if(uniqueFieldsToCheck) {
        //check for matches
      }

      const _id = value._id || buildSchema_Id();
      const response = await data.set(_id, { ...validated, _id });

      await data.remove(_id);
      
      return response;
    },
    find: async (filter, options) => {
      const { _id } = siftOut(filter);

      return await data.get(`${collectionName}:${key}`, options);
    },
    labelMaps
  };
};

export default amptModel;