import { data } from '@ampt/data';
import { events } from '@ampt/sdk';
import { isEmptyObject } from '../../../src/utils';
import validate from './validate';
import { isMeta, siftOutLabelAndFetch } from './utils';

function buildUrlKey(collectionName, filter) {
    return filter.includes(':') 
        ? filter
        : `${collectionName}:${filter}`;
}

function select(item, selectedKeys) {
    if(!selectedKeys) {
        return item;
    }

    const selectedFields = {};

    Object.entries(item).forEach(([field, value]) => {
        if (selectedKeys.includes(`-${field}`)) {
            return;
        }

        if (selectedKeys.includes(`${field}`) || selectedKeys.includes('-'))  {
            selectedFields[field] = value;
        }
    });
  
    return selectedFields;
}

function respond(response, selectedKeys, _id) {
    if(!response) {
        return null;
    }

    const { items, key, value } = response;
    const getSelection = itm => select(itm, selectedKeys);

    if(value) {
        const item = getSelection({ _id:key, ...value });

        return _id ? item : [item];
    }

    if (!items) {
        return [];
    }

    return items.map(
        itm => 
        getSelection({ _id: itm.key, ...itm.value })
    );
}

function sift(filter={}) {
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

export default function(collectionName, schema) {
    const save = async (body) => {
        const { key, validated, metadata } = await validate(schema, body, collectionName);

        await data.set(key, validated, metadata);
        const savedItem = { _id:key, ...validated, ...metadata };

        events.publish(`${collectionName}.saved`, savedItem);        
        return savedItem;
    }

    const find = async (filter) => {
        const { _id, query, metadata, selectedKeys } = sift(filter);
      
        if(_id || isEmptyObject(query)) {
            const key = buildUrlKey(collectionName, _id || '*');
            const meta = { meta: true, ...metadata };
            const response = await data.get(key, meta);

            return respond(response, selectedKeys, _id);
        }
      
        const response = await siftOutLabelAndFetch(
            schema,
            query,
            collectionName,
            metadata
        );

        return respond(response, selectedKeys);
    };

    const findOne = async(filter) => {
        const results = await find(filter) || [];

        return results[0];
    };
      
    const update = async (filter, body) => {   
        const results = await find(filter) || [];
        const found = results[0];

        if(!found || !found._id) {
            return { error: `${JSON.stringify(filter)} does not exist` };
        }

        const { _id } = found;
        const newItem = { ...found, ...body };

        const { validated, metadata } = await validate(schema, newItem, collectionName, true);

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