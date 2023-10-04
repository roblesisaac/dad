export default function(collectionName, config) {

  const validLabels = new Set(['label1', 'label2', 'label3', 'label4', 'label5']);
  const { labelNames, labelsConfig } = init(config);

  function buildUrl(url, validated, labelName) {
    const propString = String(labelName);
        
    return validated.hasOwnProperty(propString) ? 
      `${url}_${validated[propString]}`
      : url;
  }

  function createLabelValue(labelName, labelValue) {
    if(!labelValue.includes('*')) labelValue += '*';

    return `${collectionName}:${labelName}_${labelValue}`;
  }

  function handleError(message) {
    throw new Error(`LabelMap Error for collection '${collectionName}': ${message}`);
  }

  function isObject(input) {
    return typeof input === 'object' && !Array.isArray(input);
  }

  function getFirstKeyAndValueFromObject(inputObject) {
    const objKey = Object.keys(inputObject)[0];

    return {
      objKey,
      objValue: inputObject[objKey],
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
    return validLabels.has(input);
  }  

  return {
    collectionName,
    labelsConfig,
    labelNames,
    createLabelKey: async function(labelName, validated) {
      const labelNumber = this.getLabelNumber(labelName);
      const labelConfig = labelsConfig[labelNumber];
      const url = `${collectionName}:${labelName}`;

      if(labelConfig.concat && isObject(labelConfig)) {
        const { concat } = labelConfig;

        if(!Array.isArray(concat)) {
          handleError(`concat must be an array for '${labelName}'`);
        }

        if(!concat.every(key => validated.hasOwnProperty(key))) {
          handleError(`some concat keys are missing for '${labelName}'`);
        }
        
        const concattedValue = concat.map(key => validated[key]).join('');
        
        return `${url}_${concattedValue}`;
      }

      if(labelName == labelConfig) {
        return buildUrl(url, validated, labelName);
      }

      const computedConstructor = labelConfig.value || labelConfig.computed || labelConfig;

      if(typeof computedConstructor === 'function') {
        try {
          const computedOutput = await computedConstructor({ item: validated }, labelName);          
          return `${url}_${computedOutput}`;        
        } catch (error) {
          handleError(`Error in ${labelName} : ${error.message}`);
        }
      }

      return `${url}_${computedConstructor}`;
    },
    createLabelKeys: async function(validated, skipped) {
      const createdLabelKeys = {};

      for(const labelName in labelNames) {
        if(skipped?.includes(labelName)) {
          continue;
        }

        const labelKey = await this.createLabelKey(labelName, validated);
        const labelNumber = this.getLabelNumber(labelName);
        
        createdLabelKeys[labelNumber] = labelKey;
      }

      return createdLabelKeys;
    },
    hasLabel(uniqueField) {
      return !!labelNames[uniqueField];
    },
    isLabel,
    getLabelNumber: (labelName) => {
      const labelNumber = labelNames[labelName];

      if(!labelNumber) {        
        handleError(`No label for '${labelName}'`);
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