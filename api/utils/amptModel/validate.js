export default async (schema, dataToValidate, config) => {
  if (!dataToValidate) {
    return async (toValidate, config) => await validate(schema, toValidate, config);
  }

  return await validate(schema, dataToValidate, config);
};

async function validate(schema, dataToValidate, config={}) {
  const validated = {};
  const uniqueFieldsToCheck = [];

  if (typeof schema === 'function') {
    return { validated: await schema(dataToValidate) };
  }

  if (typeof dataToValidate !== 'object') {
    return await validateItem(schema, dataToValidate, undefined, config);
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

    if(!!validationResult._isAGetter) {
      continue;
    }

    validated[field] =  validationResult.validated;

    if(validationResult.unique) {
      uniqueFieldsToCheck.push(validationResult.unique);
    }

  }

  return { uniqueFieldsToCheck, validated };
}

async function validateItem(rules, dataToValidate, field=dataToValidate, config) {
  let dataValue = getDataValue(dataToValidate, field);

  if(rules.get && !rules[config.action]) {
    return {
      _isAGetter: true
    };
  }

  dataValue = formatValue(dataValue, config.globalConfig);
  dataValue = formatValue(dataValue, rules);

  if(dataToValidate.hasOwnProperty(field)) {
    dataToValidate[field] = dataValue;
  };

  if (rules.computed || isAComputedField(rules)) {
    try {
      const computedConstructor = rules.computed || rules;
      dataValue = await computedConstructor({ value: dataValue, item: dataToValidate });
    } catch (e) {
      throw new Error(`${field} failed computed validation: ${e.message}`);
    }
  }

  const specialAction = rules[config.action];

  if(specialAction && typeof specialAction === 'function') {
    dataValue = await specialAction({ value: dataValue, item: dataToValidate });
  }

  if (rules.default !== undefined && (dataValue === undefined || dataValue === null)) {
    dataValue = rules.default;
  }

  if (rules.required && (dataValue === undefined || dataValue === null || dataValue === '')) {
    throw new Error(`${field} is required`);
  }

  const rule = rules.type || rules;
  const dataTypeName = typeof dataValue;
  const rulesTypeName = getTypeName(rule);
  const isAValidType = rulesTypeName === '*' || dataTypeName === rulesTypeName;

  if (!isAValidType) {
    if(rules.strict) {
      throw new Error(`${field} must be of type ${rulesTypeName}`);
    }

    if(typeof rule === 'function') {
      dataValue = rule(dataValue);
    }
  }

  if (rules.enum && !rules.enum.includes(dataValue)) {
    throw new Error(`${field} must be one of ${rules.enum}`);
  }

  if (rules.validate && !await rules.validate(dataValue)) {
    throw new Error(`${field} failed custom validation`);
  }

  if (rules.min !== undefined && dataValue < rules.min) {
    throw new Error(`${field} must be at least ${rules.min}`);
  }

  if (rules.max !== undefined && dataValue > rules.max) {
    throw new Error(`${field} must be at most ${rules.max}`);
  }

  if (rules.minLength !== undefined && dataValue.length < rules.minLength) {
    throw new Error(`${field} must have a minimum length of ${rules.minLength}`);
  }

  if (rules.maxLength !== undefined && dataValue.length > rules.maxLength) {
    throw new Error(`${field} must have a maximum length of ${rules.maxLength}`);
  }

  if (rules.select === false) {
    return {};
  }

  return { 
    unique: rules.unique ? field : undefined,
    validated: dataValue
  }
}

function formatValue(dataValue, rules) {
  if(!rules) {
    return dataValue;
  }

  if (rules.trim && typeof dataValue === 'string') {
    dataValue = dataValue.trim();
  }

  if (rules.lowercase && typeof dataValue === 'string') {
    dataValue = dataValue.toLowerCase();
  }

  if (rules.uppercase && typeof dataValue === 'string') {
    dataValue = dataValue.toUpperCase();
  }

  return dataValue;
}

function getDataValue(dataToValidate, field) {
  return typeof dataToValidate === 'object' && dataToValidate !== null 
  ? dataToValidate[field] 
  : dataToValidate;
}

function getTypeName(rule) {
  return typeof rule === 'function' ? rule.name.toLowerCase() : rule;
}

function isAJavascriptType(rules) {
  return [String, Number, Object, Function, Boolean, Date, RegExp, Map, Set, Promise, WeakMap, WeakSet].includes(rules);
}

function isAComputedField(rules) {
  return typeof rules === 'function' && !isAJavascriptType(rules)
}

function isANestedArray(rules) {
  return Array.isArray(rules) || rules.type === Array || rules === Array
}

function isANestedObject(itemValue) {
  return typeof itemValue === 'object' && !itemValue.hasOwnProperty('type') && !itemValue.hasOwnProperty('get') && !itemValue.hasOwnProperty('set') && !itemValue.hasOwnProperty('computed');
}