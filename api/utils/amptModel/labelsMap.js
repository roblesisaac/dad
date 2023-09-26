export default function(collectionName, labelsConfig) {
  const labelNumbers = {};

  function buildConfig() {
    for (const labelNumber in labelsConfig) { 
      if(!isLabel(labelNumber)) {
        throw new Error(`Invalid label: ${labelNumber}`);
      }
  
      const labelConfig = labelsConfig[labelNumber];
  
      const labelName = typeof labelConfig === 'function' 
        ? labelNumber 
        : labelConfig.name || labelConfig;
  
      labelNumbers[labelName] = labelNumber;
    }
  }

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
    const validLabels = Array.from({ length: 5 }, (_, i) => `label${i + 1}`);

    return validLabels.includes(field);
  }

  function init() {
    buildConfig();
  }

  init();

  return {
    collectionName,
    labelsConfig,
    labelNumbers,
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
    },
    writeLabelKey: async function(labelName, validated) {
      const labelNumber = this.getLabelNumber(labelName);
      const labelConfig = this.labelsConfig[labelNumber];

      if(!labelConfig) {
        throw new Error(`No label ${labelNumber}`);
      }

      const url = `${this.collectionName}:${labelName}_`;
      const isPlainObjectOrFunction = (typeof labelConfig === 'object' && !Array.isArray(labelConfig)) || typeof labelConfig === 'function';

      if(!isPlainObjectOrFunction) {
        return `${url}${validated[labelConfig]}`;
      }

      if(labelConfig.concat) {
        let concatSpecs = labelConfig.concat;

        if(!Array.isArray(concatSpecs) && concatSpecs.includes(',')) {
          concatSpecs = concatSpecs.split(',');          
        }

        const concattedValue = concatSpecs.map(key => validated[key]).join('');
        return `${url}${concattedValue}`;
      }

      const computedConstructor = labelConfig.value || labelConfig.computed || labelConfig;

      if(typeof computedConstructor === 'function') {
        try {
          const computedOutput = await computedConstructor({ item: validated }, labelName);
          return `${url}${computedOutput}`;
        
        } catch (error) {
          throw new Error(`Error in ${labelNumber} : ${error.message}`);
        }
      }
      
      return `${url}${computedConstructor}`;
    },
    writeLabelKeys: async function(validated) {
      const writtenKeys = {};

      for(const labelName in labelNumbers) {
        const labelKey = await this.writeLabelKey(labelName, validated);
        const labelNumber = this.getLabelNumber(labelName);
        
        writtenKeys[labelNumber] = labelKey;
      }

      return writtenKeys;
    }
  }
}