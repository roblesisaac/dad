export default function(collectionName, config) {
  const labelNumbers = {};
  const labelsConfig = {};
  const validLabels = Array.from({ length: 5 }, (_, i) => `label${i + 1}`);

  function buildLabelValue(labelName, labelValue) {
    if(!labelValue.includes('*')) labelValue += '*';

    return `${collectionName}:${labelName}_${labelValue}`;
  }

  function getFirstKeyAndValueFromObject(inputObject) {
    for (const key in inputObject) {
      if (inputObject.hasOwnProperty(key)) {
        return {
          objKey: key,
          objValue: inputObject[key],
        };
      }
    }
  }

  function isLabel(field) {
    return validLabels.includes(field);
  }

  function init() {
    for (const labelNumber in config) { 
      if(!isLabel(labelNumber)) {
        continue;
      }
  
      const labelConfig = labelsConfig[labelNumber] = config[labelNumber];
  
      const labelName = typeof labelConfig === 'function' 
        ? labelNumber 
        : labelConfig.name || labelConfig;
  
      labelNumbers[labelName] = labelNumber;
    }
  }

  init();

  return {
    collectionName,
    labelsConfig,
    labelNumbers,
    createLabelKey: async function(labelName, validated) {
      const labelNumber = this.getLabelNumber(labelName);
      const labelConfig = labelsConfig[labelNumber];

      if(!labelConfig) {
        throw new Error(`No label ${labelNumber}`);
      }

      const url = `${collectionName}:${labelName}`;

      if(labelName == labelConfig) {
        const labelConfigValue = validated[labelConfig];

        return labelConfigValue ? 
          `${url}_${labelConfigValue}`
          : url;
      }

      if(labelConfig.concat) {
        let concatSpecs = labelConfig.concat;

        if(!Array.isArray(concatSpecs) && concatSpecs.includes(',')) {
          concatSpecs = concatSpecs.split(',');          
        }

        const concattedValue = concatSpecs.map(key => validated[key]).join('');
        return `${url}_${concattedValue}`;
      }

      const computedConstructor = labelConfig.value || labelConfig.computed || labelConfig;

      if(typeof computedConstructor === 'function') {
        try {
          const computedOutput = await computedConstructor({ item: validated }, labelName);
          return `${url}_${computedOutput}`;
        
        } catch (error) {
          throw new Error(`Error in ${labelNumber} : ${error.message}`);
        }
      }
      
      return `${url}_${computedConstructor}`;
    },
    createLabelKeys: async function(validated) {
      const createdLabelKeys = {};

      for(const labelName in labelNumbers) {
        const labelKey = await this.createLabelKey(labelName, validated);
        const labelNumber = this.getLabelNumber(labelName);
        
        createdLabelKeys[labelNumber] = labelKey;
      }

      return createdLabelKeys;
    },
    isLabeled(uniqueField) {
      return this.labelNumbers[uniqueField];
    },
    isLabel,
    getLabelNumber: labelName => {
      const labelNumber = labelNumbers[labelName];

      if(!labelNumber) {
        throw new Error(`No label ${labelName}`);
      }

      return labelNumber;
    },
    getArgumentsForGetByLabel(filter) {
      const { objKey, objValue } = getFirstKeyAndValueFromObject(filter);
      const labelValue = buildLabelValue(objKey, objValue);

      return { 
        labelNumber: this.getLabelNumber(objKey),
        labelValue 
      };
    }
  }
}