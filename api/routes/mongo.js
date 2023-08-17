import mongo from '../controllers/mongo';

import { checkVerified } from '../middlewares/auth';

export default (api) => {
    const endpoint = '/mongo/:component';
    const endpointWithId = endpoint+'/:id';

    api.get(endpoint, checkVerified, (req, res) => mongo.find(req, res));
    api.get(endpointWithId, (req, res) => mongo.findOne(req, res));
    
    api.put(endpointWithId, (req, res) => mongo.updateOne(req, res));
    api.put(endpoint, (req, res) => mongo.updateMany(req, res));
    
    api.post(endpoint, (req, res) => mongo.insert(req, res));
    
    api.delete(endpointWithId, (req, res) => mongo.deleteOne(req, res));
    api.delete(endpoint, (req, res) => mongo.deleteMany(req, res));
}