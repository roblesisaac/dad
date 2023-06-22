import { buildId } from '../../../src/utils';
import { 
  isMeta,
  siftOutLabelAndFetch 
} from './utils';

const validate = function() {
  let data = {};

  const applyFormatting = (key) => {
    const { schema, validKey } = data;
    const { lowercase, uppercase } = schema[key];
    const format = value => lowercase
      ? value.toLowerCase()
      : uppercase
      ? value.toUpperCase()
      : value;

    data.validKey = format(validKey);
  }

  const applyGlobalFormatting = async (globalFormatting) => {
    const { validKey } = data;

    data.validKey = await globalFormatting(validKey);
  }

  const applyMetaMethod = async (key) => {
    const { 
      metadata, 
      setValue,
      metaValue, 
      validated, 
      body,
      req
    } = data;

    try {
      const validMeta = await metaValue(validated || body, req);

      metadata[key] = setValue(validMeta);
    } catch(error) {
      err(`Failed to validate meta '${key}': ${body[key]} ↓↓↓
      ${error.message}`);
    }
  }

  const assignBodyKeyToValidated = (key) => {
    const { validated, body } = data;
    return validated[key] = body[key];
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

  const assignMetaReference = (key) => {
    const { metadata, validated, readable, meta, setValue } = data;
    const metaRef = validated.hasOwnProperty(readable)
      ? validated[readable]
      : meta;

    metadata[key] = setValue(metaRef);
  }

  const assignMetaValue = (key) => {
    const { metadata, setValue, metaValue } = data;
    metadata[key] = setValue(metaValue);
  }

  const bookmarkMetaForLater = (key) => {
    const { metadata, schema } = data;
    metadata[key] = schema[key];
  }

  const buildSchemaId = (collectionName) => collectionName 
  ? `${collectionName}:${buildId()}` 
  : undefined;

  const concatMetaRefs = (key) => {
    const { metadata, validated, setValue } = data;
    const concatArray = metadata[key].concat;
    let concatedRefs = '';

    concatArray.forEach(ref => {
      concatedRefs += validated[ref];
    });

    metadata[key] = setValue(concatedRefs);
  }

  const err = (message) => {
    throw new Error(message);
  }

  const getValidatedValue = async (key) => {
    const {
      body, 
      validated,
      req,
      schemaKeyType
    } = data;

    const parameters = {
      value: body[key],
      item: body,
      validated,
      req: req 
    }

    return await schemaKeyType(body[key], parameters);
  }

  const hasDefault = key => {
    const { schema } = data;

    return (schema[key]).hasOwnProperty('default');
  }

  const hasFormatting = key => {
    const { schema } = data;

    if(typeof schema[key] !== 'object' || Array.isArray(schema[key])) {
      return;
    }

    const formats = ['lowercase', 'uppercase'];

    return formats.some(format => schema[key].hasOwnProperty(format));
  };

  const initData = (collectionName, schema, body, req) => ({
    collectionName,
    schema,
    body,
    validated: {},
    metadata: {},
    req,
    schemaKeyType: null
  })

  const isAConcat = key => {
    const { metadata } = data;
    return metadata[key].hasOwnProperty('concat');
  }

  const isADuplicate = async (key) => {
    const { schema, body, collectionName } = data;
    const query = { [key]: body[key] };

    const { 
      key: duplicateKey,
      items
    } = await siftOutLabelAndFetch(schema, query, collectionName) || {};

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
    const { type, value } = schema[key] || {};

    return { 
      ...data,
      key,
      schemaKeyType: type || value || schema[key]
    };
  }

  const validateItemsInArray = (key) => {
    const { collectionName, validated, body, schemaKeyType } = data;
    const nestedSchema = schemaKeyType[0] || {};
        
    validated[key] = body[key]
        ? body[key].map(item => validate.init(collectionName, nestedSchema, item).validated)
        : schemaKeyType.map(_ => validate.init(collectionName, nestedSchema, {}).validated);
  }

  const validateSubObject = (key) => {
    const { collectionName, schema, body, validated } = data;
    validated[key] = validate.init(collectionName, schema[key], body[key]).validated;
  }

  return {
    init: async (collectionName, schema, body, req, globalFormatting) => {
      data = initData(collectionName, schema, body, req);

      for(const key in schema) {
        data = updateData(key);

        if(isMeta(key)) {
          bookmarkMetaForLater(key);
          continue;
        }

        if(isUnique(schema[key])) {
          if (!body[key]) {
            err(`Please provide a unique value for '${key}'.`);
          }

          if (await isADuplicate(key)) {
            err(`A duplicate item was found with '${key}=${body[key]}'`);
          }
        }

        if(isWild(data.schemaKeyType)) {
          assignBodyKeyToValidated(key);
          continue;
        }

        if(!body.hasOwnProperty(key)) {

          if(schema[key].required) {
            err(`Missing required property ${key}.`);
          }

          if(hasDefault(key)) {
            assignDefaultProp(key);
            continue;
          }

        }

        if(isType(data).array) {
          validateItemsInArray(key);
          continue;
        }

        if(isType(data).object) {
          validateSubObject(key);
          continue;
        }

        try {
          data.validKey = await getValidatedValue(key);

          if(hasFormatting(key)) {
            applyFormatting(key)
          }
  
          if(globalFormatting) {
            await applyGlobalFormatting(globalFormatting);
          }
  
          data.validated[key] = data.validKey;

        } catch(error) {
          err(`Failed to validate schema '${key}': ${data.body[key]} ↓↓↓
          ${error.message}`);
        }
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

        if(isAConcat(metaKey)) {
          concatMetaRefs(metaKey);
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
    build: (collectionName, schema, globalFormatting) => ({
      async forSave(body, req) {        
        const keyGen = buildSchemaId(collectionName);
        const { validated, metadata } = await validate.init(collectionName, schema, body, req, globalFormatting);

        return { keyGen, validated, metadata };
      },
      async forUpdate(body, req) {
        const { validated, metadata } = await validate.init(collectionName, schema, body, req, globalFormatting);

        return { validated, metadata };    
      }
    })
  }
}();

export default validate;