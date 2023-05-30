import models from '../models';

function handleError(req, res) {
    const { collection } = req.params;
    const error = `No schema found for '${collection}'...`;

    console.error(error);
    res.status(400).json({ error: error.toString() });
}

function init(req) {
    const { collection } = req.params;
    const { query } = req;
    const model = models[collection];

    return { model, query };
}

async function save(req, res) {
    const { model } = init(req);
    
    if(!model) {
        return handleError(req, res);
    }

    try {
        const inserted = await model.save(req.body, req);
        return res.json(inserted);
    } catch (error) {
        handleError(res, error);
    }
}

async function get(req, res) {
    const { model, query } = init(req);

    if(!model) {
        return handleError(req, res);
    }
    
    const { key } = req.params;

    try {
        let result = await model.find({ _id:key, ...query });
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

async function update(req, res) {
    const { model } = init(req);
    const { key } = req.params;

    if(!model) {
        return handleError(req, res);
    }

    try {
        let result = await model.update(key || req.query, req.body);
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

async function erase(req, res) {
    const { model } = init(req);
    const { key } = req.params;

    if(!model) {
        return handleError(req, res);
    }

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