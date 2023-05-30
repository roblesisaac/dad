import protectedRoute from '../utils/protectedRoute';
import data from '../controllers/data';

export default (api, baseUrl) => {
    const protect = protectedRoute(api, 'address', baseUrl);
    const member = protect('member');

    protect('admin').post('/address', data.save);
    member.get('/address/:key?', data.get);
    member.put('/address/:key?', data.update);
    member.delete('/address/:key?', data.erase);
};