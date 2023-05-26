import protectedRoute from '../utils/protectedRoute';
import data from '../controllers/data';

export default (api, baseUrl) => {
    const protect = protectedRoute(api, 'address', baseUrl);

    protect.post('/address', ['admin'], data.save);
    protect.get('/address/:key?', ['member'], data.get);
    protect.put('/address/:key?', ['member'], data.update);
    protect.delete('/address/:key?', ['member'], data.erase);
};