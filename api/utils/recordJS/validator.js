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
  throw new Error(message);
}

async function validate(collectionName, schema, body) {
  const validated = {};
  const metadata = {};

  for (const key in schema) {
    const schemaKeyType = schema[key].value || schema[key];
    const bodyHasKey = body.hasOwnProperty(key);

    if (isMeta(key)) {
      metadata[key] = schema[key];
      continue;
    }

    if (schema[key].unique) {
      if (!body[key]) {
        err(`Please provide a valid value for '${key}'.`);
      }

      const { 
        key: duplicateKey,
        items
      } = await siftOutLabelAndFetch(schema, body, collectionName) || {};

      const dupKey = duplicateKey
        ? duplicateKey
        : items 
        ? items[0].key 
        : null;

      if (body._id !== dupKey && (dupKey || items)) {
        err(`A duplicate item was found with ${key}=${body[key]}`);
      }
    }

    if (schemaKeyType === '*') {
      validated[key] = body[key];
      continue;
    }

    if (schema[key].required && !bodyHasKey) {
      err(`Missing required property ${key}.`);
    }

    if (schema[key].default && !bodyHasKey) {
      validated[key] = schema[key].default;
      continue;
    }

    if (Array.isArray(schemaKeyType)) {
        const nestedSchema = schemaKeyType[0] || {};
        
        validated[key] = body[key]
            ? body[key].map(itm => validate(collectionName, nestedSchema, itm).validated)
            : schemaKeyType.map(_ => validate(collectionName, nestedSchema, {}).validated);
            continue;
    }

    if (typeof schemaKeyType === 'object') {
      validated[key] = validate(collectionName, schema[key], body[key]).validated;
      continue;
    }

    try {
        validated[key] = await schemaKeyType(body[key], body, validated);
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

  return { validated, metadata };
}

const validator = (collectionName, schema) => ({
    async save(body) {        
        const keyGen = buildSchemaId(collectionName);
        const { validated, metadata } = await validate(collectionName, schema, body);

        return { keyGen, validated, metadata };
    },
    async update(body) {
        const { validated, metadata } = await validate(collectionName, schema, body);

        return { validated, metadata };    
    }
});

export default validator;