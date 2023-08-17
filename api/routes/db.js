import db from '../controllers/db';

export default function(api, baseUrl) {
    api.post(baseUrl+'/:collection', db.save);
    api.get(baseUrl+'/:collection/:key?', db.get);
    api.put(baseUrl+'/:collection/:key?', db.update);
    api.delete(baseUrl+'/:collection/:key?', db.erase);
}