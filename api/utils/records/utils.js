import { data } from '@ampt/data';

export function isMeta(str) {
    return [
      ...Array.from({ length: 5 }, (_, i) => `label${i + 1}`), 
      'meta', 
      'overwrite', 
      'ttl', 
      'limit',
      'reverse',
      'start'
    ].includes(str);
}
  
export function siftLabels(schema, filter, collectionName) {
    let labelNumber, labelValue;
  
    Object.keys(schema).forEach(labelName => {
      if(labelNumber || !isMeta(labelName)) {
          return;
      }
  
      const label = schema[labelName];
      const readable = label.name || label;
  
      if(!filter.hasOwnProperty(readable)) {
        return;
      }
  
      labelNumber = labelName;
      labelValue = `${collectionName}:${readable}_${filter[readable]}`;
    });
    
    return { labelNumber, labelValue };
}
  
export async function siftOutLabelAndFetch(
    schema,
    filter,
    collectionName, 
    metadata={}
) {
    const { labelNumber, labelValue } = siftLabels(schema, filter, collectionName);
    const meta = { meta: true, ...metadata };

    try {
      return await data.getByLabel(labelNumber, labelValue, meta) || {};
    } catch (error) {
      console.error({
        message: `Error gettingByLabel`,
        filter,
        collectionName,
        labelNumber,
        labelValue,
        error
      });

      return [];
    }
}