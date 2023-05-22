import data from '../controllers/data';

export default function(api, baseUrl) {
    api.post(baseUrl+'/:collection', data.save);
    api.get(baseUrl+'/:collection/:key?', data.get);
    api.put(baseUrl+'/:collection/:key?', data.update);
    api.delete(baseUrl+'/:collection/:key?', data.erase);
}