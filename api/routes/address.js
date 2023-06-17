import protectedRoute from '../utils/protectedRoute';
import { data } from '@ampt/data';
import db from '../controllers/data';

export default (api, baseUrl) => {
    const protect = protectedRoute(api, 'address', baseUrl);
    const member = protect('member');
    const admin = protect('admin');

    member.post('/address', db.save);
    member.get('/address/:key?', concatUserId, db.get);
    member.put('/address/:key?', userOwnsItem, db.update);
    member.delete('/address/:key?', userOwnsItem, db.erase);

    admin.get('/alladdresses/:key?', db.get);

    function concatUserId(req, _, next) {
        req.query.userId = req.user._id;
        next();
    }

    async function userOwnsItem(req, res, next) {
        if(req.user.role === 'admin') {
            return next();
        }

        const { key } = req.params;

        const { userId } = await data.get(key);

        if(userId === req.user._id) {
            return next();
        }

        res.status(400).json(`User Privilege Error: Editing Other Users' Addresses Prohibited.`);
    }
};