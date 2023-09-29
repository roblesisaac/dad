export default function(collectionName, config) {
  const { labelNames, labelsConfig } = init(config);

  function createLabelValue(labelName, labelValue) {
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

  function init(config) {
    const labelsConfig = {};
    const labelNames = {};

    for (const labelNumber in config) { 
      if(!isLabel(labelNumber)) {
        continue;
      }
  
      const labelConfig = labelsConfig[labelNumber] = config[labelNumber];
  
      const labelName = typeof labelConfig === 'function' 
        ? labelNumber 
        : labelConfig.name || labelConfig;
  
      labelNames[labelName] = labelNumber;
    }

    return { labelsConfig, labelNames };
  }
  
  function isLabel(input) {
    const validLabels = new Set(['label1', 'label2', 'label3', 'label4', 'label5']);
    
    return validLabels.has(input);
  }  

  return {
    collectionName,
    labelsConfig,
    labelNames,
    createLabelKey: async function(labelName, validated) {
      const labelNumber = this.getLabelNumber(labelName);
      const labelConfig = labelsConfig[labelNumber];

      if(!labelConfig) {
        throw new Error(`No label ${labelNumber}`);
      }

      const url = `${collectionName}:${labelName}`;

      if(labelName == labelConfig) {
        return validated.hasOwnProperty(labelConfig) ? 
          `${url}_${validated[labelConfig]}`
          : url;
      }

      if(labelConfig.concat) {
        const { concat } = labelConfig;

        if(!Array.isArray(concat)) {
          throw new Error('concat must be an array');
        }

        if(!concat.every(key => validated.hasOwnProperty(key))) {
          throw new Error('concat keys must be valid');
        }
        
        const concattedValue = concat.map(key => validated[key]).join('');
        
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

      for(const labelName in labelNames) {
        const labelKey = await this.createLabelKey(labelName, validated);
        const labelNumber = this.getLabelNumber(labelName);
        
        createdLabelKeys[labelNumber] = labelKey;
      }

      return createdLabelKeys;
    },
    hasLabel(uniqueField) {
      return this.labelNames[uniqueField];
    },
    isLabel,
    getLabelNumber: (labelName) => {
      const labelNumber = labelNames[labelName];

      if(!labelNumber) {        
        throw new Error(`No label ${labelName}`);
      }

      return labelNumber;
    },
    getArgumentsForGetByLabel(filter) {
      const { objKey, objValue } = getFirstKeyAndValueFromObject(filter);
      const labelValue = createLabelValue(objKey, objValue);

      return { 
        labelNumber: this.getLabelNumber(objKey),
        labelValue 
      };
    }
  }
}