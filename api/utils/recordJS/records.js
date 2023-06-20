import { data } from '@ampt/data';
import { events } from '@ampt/sdk';
import { isEmptyObject } from '../../../src/utils';
import validator from './validator';
import { isMeta, siftOutLabelAndFetch } from './utils';

export default function(collectionName, schema) {
    if(typeof collectionName !== 'string') {
        throw error(`Collection names for records should be a string`);
    }

    const validate = validator.build(collectionName, schema);

    const save = async (body, req) => {
        const { keyGen, validated, metadata } = await validate.forSave(body, req);

        await data.set(keyGen, validated, metadata);
        const savedItem = { _id:keyGen, ...validated, ...metadata };

        events.publish(`${collectionName}.saved`, savedItem);        
        return savedItem;
    }

    const find = async (filter) => {
        const { _id, query, metadata, selectedKeys } = sift(filter);

        if(_id || isEmptyObject(query)) {
            const key = buildUrlKey(collectionName, _id || '*');
            const meta = { meta: true, ...metadata };
            const response = await data.get(key, meta);

            return await respond(response, selectedKeys, _id, schema);
        }

        const response = await siftOutLabelAndFetch(
            schema,
            query,
            collectionName,
            metadata
        );

        return await respond(response, selectedKeys, null, schema);
    };

    const findOne = async(filter) => {
        const results = await find(filter) || [];

        return results[0];
    };
      
    const update = async (filter, updates, req) => {
        const results = await find(filter) || [];

        const found = Array.isArray(results) ? results[0] : results;

        if(!found || !found._id) {
            return { error: `${JSON.stringify(filter)} does not exist` };
        }

        const { _id } = found;
        const newItem = { ...found, ...updates };

        const { validated, metadata } = await validate.forUpdate(newItem, req);

        const response = await data.set(_id, validated, metadata);
        const updated = { 
            _id,
            ...response
        }
        
        events.publish(`${collectionName}.updated`, updated);
        return updated
    }

    const erase = async (filter) => {
        const { _id } = await find(filter) || {};

        if(!_id) {
            return { error: `${JSON.stringify(filter)} does not exist` };
        }

        const erased = await data.remove(_id);
        
        events.publish(`${collectionName}.erased`, erased);
        return { erased };
    }

    return { 
        get: data.get.bind(data),
        set: data.set.bind(data),
        remove: data.remove.bind(data),
        save,
        find,
        findOne,
        update, 
        erase
    };
}

function buildUrlKey(collectionName, filter) {
    return filter.includes(':') 
        ? filter
        : `${collectionName}:${filter}`;
}

function isSelected(selectedKeys='', field) {
    return selectedKeys.includes('-') 
    ? !selectedKeys.includes(`-${field}`)
    : selectedKeys.includes(field) || !selectedKeys.length;
}

async function select(item, selectedKeys, schema) {
    const selected = {};
  
    for (const [field, value] of Object.entries(item)) {
        if (!isSelected(selectedKeys, field)) {
            continue;
        }

        const { ref, get } = schema[field] || {};

        selected[field] = get
            ? await get(value)
            : ref
            ? await data.get(value)
            : value;
    }
  
    return selected;
}  

async function respond(response, selectedKeys, _id, schema) {
    if(!response) {
        return null;
    }

    const { items, key, value, lastKey } = response;
    const getSelection = async (itm) => await select(itm, selectedKeys, schema);

    if(value) {
        const item = await getSelection({ _id:key, ...value });

        return _id ? item : [item];
    }

    if (!items) {
        return [];
    }

    const selection = await Promise.all(
        items.map(async (itm) => await getSelection({ _id: itm.key, ...itm.value }))
    );
      

    return lastKey ? {
        lastKey,
        items: selection
    } : selection;
}

function sift(filter={}) {
    if(typeof filter === 'string') {
        return { _id: filter };
    }

    const { _id } = filter;
    const query = {};
    const metadata = {};
    let selectedKeys;
    const methods = {
        reverse: n => metadata.reverse = n === 'true' ? true : false,
        select: n => selectedKeys = n,
        limit: n => metadata.limit = Number(n)
    };

    delete filter._id;

    Object.keys(filter).forEach(key => {
        if(methods[key]) {
            return methods[key](filter[key]);
        }

        if(isMeta(key)) {
            return metadata[key] = filter[key];
        }

        query[key] = filter[key];
    });

    return { _id, query, metadata, selectedKeys };
}