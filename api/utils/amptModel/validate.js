export default async (schema, dataToValidate, config) => {
  if (!dataToValidate) {
    return async (toValidate, config) => await validate(schema, toValidate, config);
  }

  return await validate(schema, dataToValidate, config);
};

async function validate(schema, dataToValidate, config={}) {
  const validated = {};
  const uniqueFieldsToCheck = [];
  const refs = [];
  const skipped = [];

  if (typeof schema === 'function') {
    return { validated: await schema(dataToValidate) };
  }

  if (typeof dataToValidate !== 'object') {
    return {
      validated: await validateItem(schema, dataToValidate, undefined, config)
    };
  }

  for (const field in schema) {
    const rules = schema[field];

    if (isANestedArray(rules)) {
      if (!Array.isArray(dataToValidate[field])) {
        throw new Error(`${field} must be an array`);
      }

      validated[field] = [];
      const arrayRules = rules[0] || '*';

      for (const item of dataToValidate[field]) {
        const validationResult = await validate(arrayRules, item, config);
        validated[field].push(validationResult.validated);
      }
      continue;
    }

    if (isANestedObject(schema[field])) {
      if (typeof dataToValidate[field] !== 'object' || Array.isArray(dataToValidate[field])) {
        throw new Error(`${field} must be an object`);
      }

      const validationResult = await validate(rules, dataToValidate[field], config);
      validated[field] = validationResult.validated;
      continue;
    }

    const validationResult = await validateItem(rules, dataToValidate, field, config);

    if(!!validationResult?._shouldSkip) {
      skipped.push(field);
      continue;
    }

    validated[field] = validationResult;

    if(rules.unique) {
      uniqueFieldsToCheck.push(field);
    }

    if(rules.ref) {
      refs.push(field);
    }

  }  

  return { uniqueFieldsToCheck, validated, refs, skipped };
}

async function validateItem(rules, dataToValidate, field=dataToValidate, config) {
  const _shouldSkip = rules.hasOwnProperty('get') && !config.action;

  if(_shouldSkip) {
    return { _shouldSkip };
  }

  let dataValue = getDataValue(dataToValidate, field);

  // perform global validations first
  for(const globalFormat in config.globalConfig) {
    const ruleFunction = getRuleFunction(globalFormat, rules, dataToValidate, field, dataValue, config);

    if(ruleFunction) {
      dataValue = await ruleFunction();
      setValue(dataToValidate, field, dataValue);
    }
  }

  // then local validations
  for(const ruleName of Object.keys(rules)) {
    const ruleFunction = getRuleFunction(ruleName, rules, dataToValidate, field, dataValue, config);
    
    if(ruleFunction) {
      dataValue = await ruleFunction();
      setValue(dataToValidate, field, dataValue);
    }
  }

  if(typeof rules === 'function') {
    if(isAJavascriptType(rules)) {
      return rules(dataValue);
    }
    
    return await executeCustomMethod(rules, dataToValidate, field, dataValue)
  }

  return dataValue;
}

async function executeCustomMethod(method, item, field, value) {
  try {
    return await method(value, { value, item });
  } catch (e) {
    throw new Error(`${field} failed ${method.name} validation: ${e.message}`);
  }
}

function getDataValue(dataToValidate, field) {
  return typeof dataToValidate === 'object' && dataToValidate !== null 
  ? dataToValidate[field] 
  : dataToValidate;
}

function getRuleFunction(ruleName, rules, dataToValidate, field, dataValue, config) {
  const computed = async () => {
    return await executeCustomMethod(rules.computed, dataToValidate, field, dataValue);
  }

  const enumerator = () => {
    if (!rules.enum.includes(dataValue)) {
      throw new Error(`${field} must be one of ${rules.enum}`);
    }

    return dataValue;
  }

  const lowercase = () => {
    if(typeof dataValue === 'string') {
      return dataValue.toLowerCase();
    }

    return dataValue;
  }

  const max = () => {
    if (dataValue > rules.max) {
      throw new Error(`${field} must be at most ${rules.max}`);
    }

    return dataValue;
  }

  const min = () => {
    if (dataValue < rules.min) {
      throw new Error(`${field} must be at least ${rules.min}`);
    }

    return dataValue;
  }

  const maxLength = () => {
    if (dataValue.length > rules.maxLength) {
      throw new Error(`${field} must have a maximum length of ${rules.maxLength}`);
    }

    return dataValue;
  }

  const minLength = () => {
    if (dataValue.length < rules.minLength) {
      throw new Error(`${field} must have a minimum length of ${rules.minLength}`);
    }

    return dataValue;
  }

  const proper = () => {
    if (typeof dataValue !== 'string' || dataValue.length === 0) {
      return dataValue;
    }
  
    return dataValue.charAt(0).toUpperCase() + dataValue.slice(1);
  }

  const required = () => {
    if (dataValue === undefined || dataValue === null) {
      throw new Error(`${field} is required`);
    }

    return dataValue;
  }

  const setDefaultValue = () => {
    if(dataValue === undefined || dataValue === null) {
      return rules.default;
    }

    return dataValue;
  }

  const specialAction = async (action) => {
    if(config?.action !== action) {
      return dataValue;
    }

    return await executeCustomMethod(rules[action], dataToValidate, field, dataValue);
  }

  const trim = () => {
    if(typeof dataValue === 'string') {
      return dataValue.trim();
    }

    return dataValue;
  }  

  const type = () => {
    if (!isAValidDataType(rules, dataValue)) {
      if(rules.strict) {
        throw new Error(`${field} must be of type ${getTypeName(rules)}`);
      }

      if(typeof rules.type === 'function') {
        return rules.type(dataValue);
      }
    }

    return dataValue
  }

  const uppercase = () => {
    if (typeof dataValue === 'string') {
      return dataValue.toUpperCase();
    }

    return dataValue
  }

  const validate = async () => {
    if (!await rules.validate(dataValue)) {
      throw new Error(`${field} failed custom validation`);
    }

    return dataValue;
  }

  return {
    // formatters
    default: setDefaultValue,
    enum: enumerator,
    lowercase,
    proper,
    trim,
    uppercase,
    // validators
    max,
    maxLength,
    min,
    minLength,
    required,
    type,
    validate,
    // computed
    computed,
    get: async () => await specialAction('get'),
    set: async () => await specialAction('set'),
  
  }[ruleName];
}

function getTypeName(rules) {
  const type = rules?.type;
  return typeof type === 'function' ? type.name.toLowerCase() : type;
}

function isAJavascriptType(rules) {
  return [String, Number, Object, Function, Boolean, Date, RegExp, Map, Set, Promise, WeakMap, WeakSet].includes(rules);
}

function isANestedArray(rules) {
  return Array.isArray(rules) || rules.type === Array || rules === Array
}

function isANestedObject(itemValue) {
  const nativePropertiesToExclude = ['type', 'get', 'set', 'computed', 'ref', 'unique'];
  return typeof itemValue === 'object' && nativePropertiesToExclude.every(prop => !itemValue.hasOwnProperty(prop));
}

function isAValidDataType(rules, dataValue) {
  const rulesTypeName = getTypeName(rules);
  const dataTypeName = typeof dataValue;
  const hasASpecifiedType = rules?.type;
  const typeIsWild = rulesTypeName === '*';
  
  return !hasASpecifiedType || typeIsWild || dataTypeName === rulesTypeName;
}

function setValue(dataToValidate, field, value) {
  if (typeof dataToValidate === 'object' && dataToValidate !== null) {
    dataToValidate[field] = value;
  }

  return value;
}