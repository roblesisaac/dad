import { buildId } from '../../../src/utils';
import { 
  isMeta,
  siftOutLabelAndFetch 
} from './utils';

const validate = function() {
  const applyMetaMethod = async ({ 
      metadata, 
      setValue,
      metaValue, 
      validated, 
      body 
    }, key) => {
    try {
      metadata[key] = setValue(await metaValue(body, validated));
    } catch(error) {
      err(`Error when validating ${key}: ${body[key]}<br/>'${error.message}'`);
    }
  }

  const applySchemaKeyType = async ({ 
    body, 
    validated,
    schemaKeyType 
  }, key) => {
    try {
      validated[key] = await schemaKeyType(body[key], body, validated);
    } catch (error) {
      err(`Error validating ${key}: ${body[key]} <br/>'${error.message}'`);
    }
  }

  const assignDefaultProp = ({ validated, schema }, key) => {
    validated[key] = schema[key].default;
  }

  const assignMeta = (data, key) => {
    const { collectionName, metadata } = data;
    const meta = metadata[key];
    const readable = meta.name || meta;

    return {
      ...data,
      meta,
      readable,
      metaValue: meta.value || meta,
      setValue: value => `${collectionName}:${readable}_${value}`
    }
  }

  const assignMetaPlaceholder = ({ metadata, schema }, key) => {
    metadata[key] = schema[key];
  }

  const assignMetaReference = ({ metadata, validated, readable, meta, setValue }, key) => {
    metadata[key] = setValue(validated[readable] || meta);
  }

  const assignMetaValue = ({ metadata, setValue, metaValue }, key) => {
    metadata[key] = setValue(metaValue);
  }

  const buildSchemaId = (collectionName) => collectionName 
  ? `${collectionName}:${buildId()}` 
  : undefined;

  const err = (message) => {
    throw new Error(message);
  }

  const handleArray = ({ collectionName, validated, body, schemaKeyType }, key) => {
    const nestedSchema = schemaKeyType[0] || {};
        
    validated[key] = body[key]
        ? body[key].map(item => validate.init(collectionName, nestedSchema, item).validated)
        : schemaKeyType.map(_ => validate.init(collectionName, nestedSchema, {}).validated);
  }

  const handleObject = ({ collectionName, schema, body, validated }, key) => {
    validated[key] = validate.init(collectionName, schema[key], body[key]).validated;
  }

  const handleWild = ({ validated, body }, key) => {
    return validated[key] = body[key];
  }

  const hasDuplicates = async ({ schema, body, collectionName }, key) => {
    const { 
      key: duplicateKey,
      items
    } = await siftOutLabelAndFetch(schema, body, collectionName) || {};

    const dupKey = duplicateKey
      ? duplicateKey
      : items 
      ? items[0].key 
      : null;

    return body._id !== dupKey && (dupKey || items);
  }

  const initData = (collectionName, schema, body) => ({
    collectionName,
    schema,
    body,
    validated: {},
    metadata: {},
    schemaKeyType: null
  })

  const isFunction = ({ metaValue }) => typeof metaValue === 'function';

  const isReferenceToBody = ({ readable, metaValue }) => {
    return typeof readable === 'string' && typeof metaValue === 'string';
  }

  const isType = ({ schemaKeyType }) => ({
    array: Array.isArray(schemaKeyType),
    object: typeof schemaKeyType === 'object'
  })

  const isUnique = ({ unique }) => !!unique;

  const isWild = (symbol) => symbol === '*';

  const updateData = (data, key) => {
    const { schema } = data;

    return { 
      ...data,
      key,
      schemaKeyType: schema[key].value || schema[key]
    };
  }

  return {
    init: async (collectionName, schema, body) => {
      let data = initData(collectionName, schema, body);

      for(const key in schema) {
        data = updateData(data, key);

        if(isMeta(key)) {
          assignMetaPlaceholder(data, key);
          continue;
        }

        if(isUnique(schema[key])) {
          if (!body[key]) {
            err(`Please provide a valid value for '${key}'.`);
          }

          if (await hasDuplicates(data, key)) {
            err(`A duplicate item was found with ${key}=${body[key]}`);
          }
        }

        if(isWild(data.schemaKeyType)) {
          handleWild(data, key);
          continue;
        }

        if(!body.hasOwnProperty(key)) {

          if(schema[key].required) {
            err(`Missing required property ${key}.`);
          }

          if(schema[key].default) {
            assignDefaultProp(data, key);
            continue;
          }

        }

        if(isType(data).array) {
          handleArray(data, key);
          continue;
        }

        if(isType(data).object) {
          handleObject(data, key);
          continue;
        }

        await applySchemaKeyType(data, key);
      }

      for(const metaKey in data.metadata) {
        data = assignMeta(data, metaKey);
        
        if(!data.readable) {
          continue;
        }
    
        if(isReferenceToBody(data)) {
          assignMetaReference(data, metaKey);
          continue;
        }

        if(!isFunction(data)) {
          assignMetaValue(data, metaKey);
          continue;
        }

        await applyMetaMethod(data, metaKey);
      }

      return data;
    },
    build: (collectionName, schema) => ({
      async forSave(body) {        
        const keyGen = buildSchemaId(collectionName);
        const { validated, metadata } = await validate.init(collectionName, schema, body);

        return { keyGen, validated, metadata };
      },
      async forUpdate(body) {
        const { validated, metadata } = await validate.init(collectionName, schema, body);

        return { validated, metadata };    
      }
    })
  }
}();

export default validate;