export default async (schema, dataToValidate, props) => {
  if (!dataToValidate) {
    return async (toValidate, props) => await validate(schema, toValidate, props);
  }

  return await validate(schema, dataToValidate, props);
};

async function validate(schema, dataToValidate, props) {
  const validated = {};
  const uniqueFieldsToCheck = [];

  if (typeof schema === 'function') {
    return { validated: await schema(dataToValidate) };
  }

  if (typeof dataToValidate !== 'object') {
    return await validateItem(schema, dataToValidate, false, props);
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
        const validationResult = await validate(arrayRules, item, props);
        validated[field].push(validationResult.validated);
      }
      continue;
    }

    if (isANestedObject(schema[field])) {
      if (typeof dataToValidate[field] !== 'object' || Array.isArray(dataToValidate[field])) {
        throw new Error(`${field} must be an object`);
      }

      const validationResult = await validate(rules, dataToValidate[field], props);
      validated[field] = validationResult.validated;
      continue;
    }

    const validationResult = await validateItem(rules, dataToValidate, field, props);

    validated[field] = validationResult.validated;
    uniqueFieldsToCheck.push(validationResult.unique);
  }

  return { validated, uniqueFieldsToCheck };
}

async function validateItem(rules, dataToValidate, field, props) {
  field = field || dataToValidate;
  let dataValue = getDataValue(dataToValidate, field);
  const rule = getRule(rules);
  const rulesType = getTypeName(rule);
  
  if(rulesType === '*') {
    return { validated: dataValue };
  }

  if (rules.computed || isAComputedField(rules)) {
    try {
      dataValue = await rules.computed(dataValue, { item: dataToValidate, ...props });
    } catch (e) {
      throw new Error(`${field} failed computed validation`);
    }
  }

  if (rules.default !== undefined && (dataValue === undefined || dataValue === null)) {
    dataValue = rules.default;
    return { validated: dataValue };
  }

  if (rules.required && (dataValue === undefined || dataValue === null || dataValue === '')) {
    throw new Error(`${field} is required`);
  }

  if (typeof dataValue !== 'undefined' && rulesType && typeof dataValue !== rulesType) {
    if(rules.strict) {
      throw new Error(`${field} must be of type ${rulesType}`);
    }

    if(typeof rule === 'function') {
      dataValue = rule(dataValue);
    }
  }

  if (rules.enum && !rules.enum.includes(dataValue)) {
    throw new Error(`${field} must be one of ${rules.enum}`);
  }

  if (rules.validate && !rules.validate(dataValue)) {
    throw new Error(`${field} failed custom validation`);
  }

  if (rules.min !== undefined && dataValue < rules.min) {
    throw new Error(`${field} must be at least ${rules.min}`);
  }

  if (rules.max !== undefined && dataValue > rules.max) {
    throw new Error(`${field} must be at most ${rules.max}`);
  }

  if (rules.minlength !== undefined && dataValue.length < rules.minlength) {
    throw new Error(`${field} must have a minimum length of ${rules.minlength}`);
  }

  if (rules.maxlength !== undefined && dataValue.length > rules.maxlength) {
    throw new Error(`${field} must have a maximum length of ${rules.maxlength}`);
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

  if (rules.select === false) {
    return {};
  }

  const result = { validated: dataValue };

  if (rules.unique) {
    result.unique = dataValue;
  }

  return result;
}

function getDataValue(dataToValidate, field) {
  return typeof dataToValidate === 'object' && dataToValidate !== null 
  ? dataToValidate[field] 
  : dataToValidate;
}

function getTypeName(rule) {
  return typeof rule === 'function' ? rule.name.toLowerCase() : rule;
}

function getRule(rules) {
  return typeof rules === 'function' 
    ? rules 
    : rules.type ||  rules;
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
  return typeof itemValue === 'object' && !itemValue.hasOwnProperty('type');
}