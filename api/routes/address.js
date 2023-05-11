import { checkVerified } from '../middlewares';
import address from '../controllers/address';

export default (api) => {
    api.get('/api/address/:addresskey', checkVerified, address.get);

    api.get('/api/addresses/:userkey', checkVerified, address.getAll);
    
    api.delete('/api/address/:addresskey', checkVerified, address.remove);
    
    api.post('/api/address/:userkey', checkVerified, address.save);
    
    api.put('/api/address/:addresskey', checkVerified, address.update);
};