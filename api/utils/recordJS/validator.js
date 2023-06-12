import { buildId } from '../../../src/utils';
import { 
  isMeta,
  siftOutLabelAndFetch 
} from './utils';

const validate = function() {
  let data = {};

  const applyMetaMethod = async (key) => {
    const { 
      metadata, 
      setValue,
      metaValue, 
      validated, 
      body 
    } = data;

    try {
      metadata[key] = setValue(await metaValue(body, validated));
    } catch(error) {
      err(`Error when validating ${key}: ${body[key]}<br/>'${error.message}'`);
    }
  }

  const applySchemaKeyType = async (key) => {
    const {
      body, 
      validated,
      schemaKeyType
    } = data;

    try {
      validated[key] = await schemaKeyType(body[key], body, validated);
    } catch (error) {
      err(`Error validating ${key}: ${body[key]} <br/>'${error.message}'`);
    }
  }

  const assignDefaultProp = (key) => {
    const { validated, schema } = data;
    validated[key] = schema[key].default;
  }

  const assignMeta = (key) => {
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

  const assignMetaPlaceholder = (key) => {
    const { metadata, schema } = data;
    metadata[key] = schema[key];
  }

  const assignMetaReference = (key) => {
    const { metadata, validated, readable, meta, setValue } = data;
    metadata[key] = setValue(validated[readable] || meta);
  }

  const assignMetaValue = (key) => {
    const { metadata, setValue, metaValue } = data;
    metadata[key] = setValue(metaValue);
  }

  const buildSchemaId = (collectionName) => collectionName 
  ? `${collectionName}:${buildId()}` 
  : undefined;

  const err = (message) => {
    throw new Error(message);
  }

  const handleArray = (key) => {
    const { collectionName, validated, body, schemaKeyType } = data;
    const nestedSchema = schemaKeyType[0] || {};
        
    validated[key] = body[key]
        ? body[key].map(item => validate.init(collectionName, nestedSchema, item).validated)
        : schemaKeyType.map(_ => validate.init(collectionName, nestedSchema, {}).validated);
  }

  const handleObject = (key) => {
    const { collectionName, schema, body, validated } = data;
    validated[key] = validate.init(collectionName, schema[key], body[key]).validated;
  }

  const handleWild = (key) => {
    const { validated, body } = data;
    return validated[key] = body[key];
  }

  const initData = (collectionName, schema, body) => ({
    collectionName,
    schema,
    body,
    validated: {},
    metadata: {},
    schemaKeyType: null
  })

  const isADuplicate = async (key) => {
    const { schema, body, collectionName } = data;
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

  const updateData = (key) => {
    const { schema } = data;

    return { 
      ...data,
      key,
      schemaKeyType: schema[key].value || schema[key]
    };
  }

  return {
    init: async (collectionName, schema, body) => {
      data = initData(collectionName, schema, body);

      for(const key in schema) {
        data = updateData(key);

        if(isMeta(key)) {
          assignMetaPlaceholder(key);
          continue;
        }

        if(isUnique(schema[key])) {
          if (!body[key]) {
            err(`Please provide a valid value for '${key}'.`);
          }

          if (await isADuplicate(key)) {
            err(`A duplicate item was found with ${key}=${body[key]}`);
          }
        }

        if(isWild(data.schemaKeyType)) {
          handleWild(key);
          continue;
        }

        if(!body.hasOwnProperty(key)) {

          if(schema[key].required) {
            err(`Missing required property ${key}.`);
          }

          if(schema[key].default) {
            assignDefaultProp(key);
            continue;
          }

        }

        if(isType(data).array) {
          handleArray(key);
          continue;
        }

        if(isType(data).object) {
          handleObject(key);
          continue;
        }

        await applySchemaKeyType(key);
      }

      for(const metaKey in data.metadata) {
        data = assignMeta(metaKey);
        
        if(!data.readable) {
          continue;
        }
    
        if(isReferenceToBody(data)) {
          assignMetaReference(metaKey);
          continue;
        }

        if(!isFunction(data)) {
          assignMetaValue(metaKey);
          continue;
        }

        await applyMetaMethod(metaKey);
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