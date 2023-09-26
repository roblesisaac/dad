import { data } from '@ampt/data';
import validator from './validate';
import { generateDate } from '../../../src/utils';
import LabelMap from './labelMap';

const amptModel = function(collectionName, schema, labelConfig) {
  const labelMap = LabelMap(collectionName, labelConfig);
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

  function getFirstObjectKeyAndValue(inputObject) {
    for (const key in inputObject) {
      if (inputObject.hasOwnProperty(key)) {
        return {
          objKey: key,
          objValue: inputObject[key],
        };
      }
    }
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
      if(typeof filter === 'string') {
        return await data.get(filter, options);
      };

      const { objKey, objValue } = getFirstObjectKeyAndValue(filter);
      let url = `${collectionName}:${objKey}_${objValue}`;

      if(!url.includes('*')) url += '*';

      const labelNumber = labelMap.getLabelNumber(objKey);

      return { labelNumber, url };
      // return await data.getByLabel(labelMap.getLabelNumber(objKey), url)
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