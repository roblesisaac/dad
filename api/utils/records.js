import { data } from "@ampt/data";
import { events } from '@ampt/sdk';
import { isEmptyObject } from "../../src/utils";
import { isMeta, validate, siftOutLabelAndFetch } from "../utils/validate";

function buildUrlKey(collectionName, filter) {
    return filter.includes(':') 
        ? filter
        : `${collectionName}:${filter}`;
}

function select(item, selection) {
    if(!selection) {
        return item;
    }

    const selectedFields = {};

    Object.entries(item).forEach(([field, value]) => {
        if (selection.includes(`-${field}`)) {
            return;
        }

        if (selection.includes(`${field}`) || selection.includes('-'))  {
            selectedFields[field] = value;
        }
    });
  
    return selectedFields;
}

function respond(response, selection) {
    if(!response) {
        return null;
    }

    const { items, key, value } = response;
    const selector = itm => select(itm, selection);

    if(value) {
        return selector({ _id:key, ...value });
    }

    if (!items || items.length===0) {
        return null;
    }

    if (items.length > 1) {
        return items.map(itm => selector({ _id: itm.key, ...itm.value }));
    }

    const item = items[0];
    const { value:val } = item;

    return selector({
        _id: item.key, 
        ...val
    });
}

function sift(filter={}) {
    const { _id } = filter;
    const query = {};
    const metadata = {};
    let selection;
    const methods = {
        reverse: n => metadata.reverse = n === 'true' ? true : false,
        select: n => selection = n,
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

    return { _id, query, metadata, selection };
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
        const { _id, query, metadata, selection } = sift(filter);
      
        if(_id || isEmptyObject(query)) {
            const key = buildUrlKey(collectionName, _id || '*');
            const response = await data.get(key, metadata);

            return respond(response, selection);
        }
      
        const response = await siftOutLabelAndFetch(
            schema,
            query,
            collectionName,
            metadata
        );

        return respond(response, selection);
    };
      
    const update = async (filter, body) => {   
        const found = await find(filter);

        if(!found || !found._id) {
            return { error: `${JSON.stringify(filter)} does not exist` };
        }

        const newItem = { ...found, ...body };

        const { validated, metadata } = await validate(schema, newItem, collectionName, true);

        const response = await data.set(newItem._id, validated, metadata);
        const updated = { 
            _id: validated._id,
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
        get: data.get,
        set: data.set,
        remove: data.remove,
        save,
        find, 
        update, 
        erase
    };
}