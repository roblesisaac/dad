import models from '../models';

function handleError(res, error) {
    console.error(error);
    if(error) res.status(400).json({ error: error.toString() });
}

function init(req) {
    const { collection } = req.params;
    const { query } = req;
    const model = models[collection];
    const initError = !model ? `No schema found for '${collection}'...` : null;

    return { initError, model, query };
}

async function save(req, res) {
    const { initError, model } = init(req);

    
    if(initError) {
        return handleError(res, initError);
    }

    try {
        const inserted = await model.save(req.body, req);
        return res.json(inserted);
    } catch (error) {
        console.log({ error });
        handleError(res, error);
    }
}

async function get(req, res) {
    const { model, query, initError } = init(req);
    
    if(initError) {
        return handleError(res, initError);
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
    const { initError, model } = init(req);
    const { key } = req.params;

    if(initError) {
        return handleError(res, initError);
    }

    try {
        let result = await model.update(key || req.query, req.body);
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

async function erase(req, res) {
    const { model, initError } = init(req);
    const { key } = req.params;

    if(initError) {
        return handleError(res, initError);
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