const api = function() {
  const data = {
    baseUrl: 'www.',
    url: ''
  };
  const state = {
    carUrls: [],
    fetchCount: 0,
    history: []
  };
  function buildUrl(url) {
    const { baseUrl } = data;
    data.url = baseUrl + url;
    console.log('buildingUrl', data.url);
  }
  function delay(ms=1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  function incr() {
    state.fetchCount++;
  }
  function remember() {
    state.history.push(data.url);
  }
  async function fetchCars() {
    console.log('fetching cars...');
    await delay(1000);
    data.cars = ['honda', 'chevy', 'ford'];
  }
  function buildCarUrl(car) {
    data.carUrl = `www.${car}.com`;
    console.log('built carurl', data.carUrl);
  }
  function storeCarUrl({ carUrl }) {
    state.carUrls.push(carUrl);
    console.log('stored', carUrl);
  }
  function buyStuffForCar(car) {
    console.log('bought stuff for', car);
  }

  return {
    state,
    get: async (url) => {
      buildUrl(url);
      await fetchCars();

      for (const car of data.cars) {
        buildCarUrl(car);
        storeCarUrl(data);
        buyStuffForCar(car);
        await delay(2000);
      }

      incr();
      remember();
      if(state.fetchCount < 2) api.get('yahoo');
    }
  }
}()

api.get('google');

const validate = function() {
  const err = (message) => {
    throw new Error(message);
  }

  const applySchemaType = async ({ 
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

  const assignMeta = ({ metadata, schema }, key) => {
    metadata[key] = schema[key];
  }

  function buildSchemaId(collectionName) {
    return collectionName 
    ? `${collectionName}:${buildId()}` 
    : undefined;
  }

  const handleArray = ({ collectionName, validated, body, schemaKeyType }, key) => {
    const nestedSchema = schemaKeyType[0] || {};
        
    validated[key] = body[key]
        ? body[key].map(item => validate.init(collectionName, nestedSchema, item).validated)
        : schemaKeyType.map(_ => validate.init(collectionName, nestedSchema, {}).validated);
  }

  const handleMeta = ({
      body,
      collectionName,
      metadata, 
      validated 
    }, key) => {
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
  }

  const handleObject = ({ collectionName, schema, body, validated }, key) => {
    validated[key] = validate.init(collectionName, schema[key], body[key]).validated;
  }

  const handleUnique = async ({ collectionName, schema, body }, key) => {
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

  const handleWild = ({ validated, body }, key) => {
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
      const data = initData(collectionName, schema, body);

      for(const key in schema) {
        data = updateData(data, key);

        if(isMeta(key)) {
          assignMeta(data, key);
          continue;
        }

        if(isUnique(schema[key])) {
          await handleUnique(data, key);
          continue;
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

        applySchemaType(data, key);
      }

      for(const metaKey in metadata) {
        handleMeta(data, metaKey);
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