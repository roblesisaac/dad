import { buildId } from '../../../src/utils';
import { 
  isMeta,
  siftOutLabelAndFetch 
} from './utils';

function buildSchemaId(collectionName) {
  return collectionName 
  ? `${collectionName}:${buildId()}` 
  : undefined;
}

function err(message) {
  console.error(message);
  throw new Error(message);
}

async function validate(
  schema, 
  body = {}, 
  collectionName, 
  isUpdate
) 
{
  const validated = {};
  const metadata = {};
  const key = buildSchemaId(collectionName);

  for (const key in schema) {
    const subjectType = typeof body[key];
    const schemaType = schema[key].value || schema[key];

    if (isMeta(key)) {
      metadata[key] = schema[key];
      continue;
    }

    if (schema[key].unique) {
      if (!body[key]) {
        err(`Please provide a valid value for '${key}'.`);
      }

      const duplicate = await siftOutLabelAndFetch(schema, body, collectionName);

      if (!isUpdate && (duplicate?.key || duplicate?.items?.length)) {
        err(`A duplicate item was found with ${key}=${body[key]}`);
      }
    }

    if (schemaType === subjectType || schemaType === '*') {
      validated[key] = body[key];
      continue;
    }

    if (schema[key].required && !body.hasOwnProperty(key)) {
      err(`Missing required property ${key}.`);
    }

    if (schema[key].default && !body[key]) {
      validated[key] = schema[key].default;
      continue;
    }

    if (body[key] && typeof schemaType === 'string') {
      console.warn(
        `Invalid type for property ${key}. Expected ${schemaType} but got '${body[key]}' which is a ${subjectType}`
      );
    }

    if (Array.isArray(schemaType)) {
      validated[key] = body[key]
        ? body[key].map(itm => validate(schemaType[0], itm).validated)
        : schemaType.map(_ => validate(schemaType[0], {}).validated);
      continue;
    }

    if (typeof schemaType === 'object') {
      validated[key] = validate(schema[key], body[key]).validated;
      continue;
    }

    const types = {
      string: () => String(body[key] || ''),
      number: () => Number(body[key] || 0),
      '*': () => body[key],
      boolean: () => typeof body[key] === 'boolean'
        ? body[key]
        : body[key] === 'true'
        ? true
        : false
    };

    const validator = types[schemaType] || schemaType;

    if (typeof validator !== 'function') {
      continue;
    }

    try {
      validated[key] = await validator(body[key], body, validated);
    } catch (error) {
      err(`Error validating ${key}: ${body[key]} <br/>'${error.message}'`);
    }
  }

  Object.keys(metadata).forEach(key => {
    const meta = metadata[key];
    const readable = meta.name || meta;
    const metaValue = meta.value || meta;
    const setValue = value => `${collectionName}:${readable}_${value}`;

    if(!readable) {
      return;
    }

    if(typeof readable === 'string' && typeof metaValue === 'string') {
      return metadata[key] = setValue(validated[readable] || meta);
    }

    if(typeof metaValue !== 'function') {
      return metadata[key] = setValue(metaValue);
    }

    try {
      metadata[key] = setValue(metaValue(body, validated));
    } catch(error) {
      err(`Error when validating ${key}: ${body[key]}<br/>'${error.message}'`);
    }
  });

  return { key, validated, metadata };
}

export default validate;