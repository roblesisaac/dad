import { protectedRoute } from '../middlewares/protectedRoute';

import { 
    concatUseridToReq,
    ensureUserCreatedItem
} from '../middlewares/utils';

import db from '../controllers/data';

export default (api, baseUrl) => {
    const protect = protectedRoute(api, 'address', baseUrl);
    const admin = protect('admin');
    const member = protect('member');

    admin.get('/alladdresses/:key?', db.get);

    member.post('/addresses', db.save);
    member.get('/addresses/:key?', concatUseridToReq, db.get);
    member.put('/addresses/:key?', ensureUserCreatedItem, db.update);
    member.delete('/addresses/:key?', ensureUserCreatedItem, db.erase);
};