import data from '../controllers/data';

export default function(api, baseUrl) {
    api.post(baseUrl+'/data', data.save);
    api.get(baseUrl+'/data/:key?', data.get);
    api.put(baseUrl+'/data/:key?', data.update);
    api.delete(baseUrl+'/data/:key?', data.erase);
}