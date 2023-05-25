import defineRoute from '../utils/defineRoute';
import data from '../controllers/data';

export default (api) => {
    const route = defineRoute(api, 'address', '/api/');

    route.post('address', data.save, ['admin']);
    route.get('address', data.get, ['public']);
    route.put('address/:key?', data.update, ['admin']);
    route.delete('address/:key?', data.erase, ['admin']);
};