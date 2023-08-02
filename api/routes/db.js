import db from '../controllers/db';

import { checkVerified } from '../middlewares/auth';

export default (api) => {
    const endpoint = '/db/:component';
    const endpointWithId = endpoint+'/:id';

    api.get(endpoint, checkVerified, (req, res) => db.find(req, res));
    api.get(endpointWithId, (req, res) => db.findOne(req, res));
    
    api.put(endpointWithId, (req, res) => db.updateOne(req, res));
    api.put(endpoint, (req, res) => db.updateMany(req, res));
    
    api.post(endpoint, (req, res) => db.insert(req, res));
    
    api.delete(endpointWithId, (req, res) => db.deleteOne(req, res));
    api.delete(endpoint, (req, res) => db.deleteMany(req, res));
}