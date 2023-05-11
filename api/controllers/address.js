import { data } from '@ampt/data';
import { buildId } from '../../src/utils';

function handleError(res, error) {
    console.error(error);
    res.status(400).json(error);
}

async function get(req, res) {
    const { addresskey } = req.params;

    if(!addresskey) {
        return handleError(res, 'Missing address key.')
    }
    
    try {
        const address = await data.get(addresskey);
        res.json(address || null);
    } catch (error) {
        handleError(res, error);
    }
}

async function getAll(req, res) {
    const { userkey } = req.params;

    if(!userkey) {
        return handleError(res, 'Missing userkey');
    }

    try {
        const addresses = await data.get(`address_${userkey}_*`);
        res.json(addresses || null);
    } catch (error) {
        handleError(res, error);
    }
}

async function remove(req, res) {
    const { addresskey } = req.params;

    if(!addresskey) {
        return handleError(res, 'Missing addresskey');
    }

    try {
        const deleted = await data.remove(addresskey);    
        res.json(deleted);
    } catch (error) {
        handleError(res, error)
    }
}

async function save(req, res) {
    const { userkey } = req.params;
    const { address } = req.body;
    const key = `address_${userkey}_${buildId()}`;

    if(!userkey || !address) {
        return handleError(res, 'Missing userkey or address');
    }

    try {
        const saved = await data.set(key, address);
        res.json(saved);
    } catch (error) {
        handleError(res, error)
    }
}
  
async function update(req, res) {
    const { addresskey } = req.params;
    const { address } = req.body;

    if(!addresskey || !address) {
        return handleError(res, 'Missing addresskey or address');
    }
    
    try {
        const updated = await data.set(addresskey, address);
        res.json(updated);
    } catch (error) {
        handleError(res, error);
    }
}

export default { save, remove, get, getAll, update };