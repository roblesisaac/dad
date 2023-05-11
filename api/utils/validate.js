import { data } from '@ampt/data';
import { buildId } from '../../src/utils';

function buildSchemaId(collectionName) {
  return collectionName 
  ? `${collectionName}:${buildId()}` 
  : undefined;
}

function err(message) {
  console.error(message);
  throw new Error(message);
}

function isMeta(str) {
  const labels = Array.from(
      { length: 5 }, 
      (_, i) => `label${i + 1}`
  );
  const metas = [
    ...labels, 
    'meta', 
    'overwrite', 
    'ttl', 
    'limit',
    'reverse',
    'start'
  ];

  return metas.includes(str);
}

function siftLabels(schema, filter, collectionName) {
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

async function siftOutLabelAndFetch(schema, filter, collectionName, metadata={}) {
  const { labelNumber, labelValue } = siftLabels(schema, filter, collectionName);

  // metadata.label = labelNumber;
  // console.log({ labelNumber, labelValue, metadata });

  // const response = await data.get(labelValue, metadata);

  const response = await data.getByLabel(labelNumber, labelValue, metadata) || {};

  console.log({
    response, nexter: response.next?.toString()
  });

  return response;
}

async function validate(schema, input = {}, collectionName, isUpdate) {
  const validated = {};
  const metadata = {};
  const key = buildSchemaId(collectionName);

  for (const key in schema) {
    const subjectType = typeof input[key];
    const schemaType = schema[key].value || schema[key];

    if (isMeta(key)) {
      metadata[key] = schema[key];
      continue;
    }

    if (schema[key].unique) {
      if (!input[key]) {
        err(`Please provide a valid value for '${key}'.`);
      }

      const duplicate = await siftOutLabelAndFetch(schema, input, collectionName);

      if (!isUpdate && (duplicate?.key || duplicate?.items?.length)) {
        err(`A duplicate item was found with ${key}=${input[key]}`);
      }
    }

    if (schemaType === subjectType || schemaType === '*') {
      validated[key] = input[key];
      continue;
    }

    if (schema[key].required && !input.hasOwnProperty(key)) {
      err(`Missing required property ${key}.`);
    }

    if (schema[key].default && !input[key]) {
      validated[key] = schema[key].default;
      continue;
    }

    if (input[key] && typeof schemaType === 'string') {
      console.warn(
        `Invalid type for property ${key}. Expected ${schemaType} but got '${input[key]}' which is a ${subjectType}`
      );
    }

    if (Array.isArray(schemaType)) {
      validated[key] = input[key]
        ? input[key].map(itm => validate(schemaType[0], itm).validated)
        : schemaType.map(_ => validate(schemaType[0], {}).validated);
      continue;
    }

    if (typeof schemaType === 'object') {
      validated[key] = validate(schema[key], input[key]).validated;
      continue;
    }

    const types = {
      string: () => String(input[key] || ''),
      number: () => Number(input[key] || 0),
      '*': () => input[key],
      boolean: () => typeof input[key] === 'boolean'
        ? input[key]
        : input[key] === 'true'
        ? true
        : false
    };

    const validator = types[schemaType] || schemaType;

    if (typeof validator !== 'function') {
      continue;
    }

    try {
      validated[key] = await validator(input, validated);
    } catch (error) {
      err(`Error validating ${key}: <br/>'${error.message}'`);
    }
  }

  Object.keys(metadata).forEach(key => {
    const meta = metadata[key];
    const readable = meta.name || meta;
    const metaValue = meta.value || meta;
    const setValue = value => `${collectionName}:${readable}_${value}`

    if(!readable) {
      return;
    }

    if(typeof readable === 'string') {
      return metadata[key] = setValue(validated[readable] || meta);
    }

    if(typeof metaValue !== 'function') {
      return metadata[key] = setValue(metaValue);
    }

    try {
      metadata[key] = setValue(metaValue(input, validated));
    } catch(error) {
      err(`Error validating ${key}: <br/>'${error.message}'`);
    }
  });

  return { key, validated, metadata };
}

export { siftLabels, siftOutLabelAndFetch, isMeta, validate };