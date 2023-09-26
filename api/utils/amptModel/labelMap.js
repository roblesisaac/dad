import { data } from '@ampt/data';

export default function(collectionName, labelConfig) {
  const labelNumbers = {};

  function isLabel(field) {
    const validLabels = Array.from({ length: 5 }, (_, i) => `label${i + 1}`);

    return validLabels.includes(field);
  }

  for (const labelNumber in labelConfig) { 
    if(!isLabel(labelNumber)) {
      throw new Error(`Invalid label: ${labelNumber}`);
    }

    const labelSpecs = labelConfig[labelNumber];

    const labelName = typeof labelSpecs === 'function' 
      ? labelNumber 
      : labelSpecs.name || labelSpecs;

    labelNumbers[labelName] = labelNumber;
  }
  

  return {
    collectionName,
    labelConfig,
    ...labelNumbers,
    getLabelNumber: readableName => labelNumbers[readableName],
    writeLabelKey: async function(readableName, validated) {
      const labelNumber = this.getLabelNumber(readableName);
      const labelSpecs = this.labelConfig[labelNumber];

      if(!labelSpecs) {
        throw new Error(`No label ${labelNumber}`);
      }

      const url = `${this.collectionName}:${readableName}_`;

      if(typeof labelSpecs === 'string') {
        return `${url}${validated[labelSpecs]}`;
      }

      if(labelSpecs.concat) {
        let concatSpecs = labelSpecs.concat;

        if(!Array.isArray(concatSpecs) && concatSpecs.includes(',')) {
          concatSpecs = concatSpecs.split(',');          
        }

        const concattedValue = concatSpecs.map(key => validated[key]).join('');
        return `${url}${concattedValue}`;
      }

      const computedConstructor = labelSpecs.value || labelSpecs.computed || labelSpecs;

      if(typeof computedConstructor === 'function') {
        try {
          const computedOutput = await computedConstructor(validated);
          return `${url}${computedOutput}`;
        
        } catch (error) {
          throw new Error(`Error in ${labelNumber} : ${error.message}`);
        }
      }
      
      return `${url}${computedLabel}`;
    }
  }
}