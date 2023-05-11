import models from '../models';

function handleError(res, error) {
    console.error(error);
    res.status(400).json({ error: error.toString() });
}

function init(req, res) {
    const { collection } = req.params;
    const { query } = req;
    
    if(!collection) {
        return handleError(res, 'Missing collection.');
    }

    const model = models[collection];

    if(!model) {
        return handleError(res, `Model not found for ${collection}`);
    }

    return { collection, model, query };
}

async function save(req, res) {
    const { model } = init(req, res);

    try {
        const inserted = await model.save(req.body);
        return res.json(inserted);
    } catch (error) {
        handleError(res, error);
    }
}

async function get(req, res) {
    const { model, query } = init(req, res);
    const { key } = req.params;

    try {
        let result = await model.find({ _id:key, ...query });
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

async function update(req, res) {
    const { model } = init(req, res);
    const { key } = req.params;

    try {
        let result = await model.update(key || req.query, req.body);
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

async function erase(req, res) {
    const { model } = init(req, res);
    const { key } = req.params;

    try {
        let result = await model.erase(key || req.query);
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

export default { 
    save,
    get, 
    update,
    erase 
};