import { data } from '@ampt/data';
import protectedRoute from '../utils/protectedRoute';
import db from '../controllers/data';

export default (api, baseUrl) => {
    const protect = protectedRoute(api, 'address', baseUrl);
    const admin = protect('admin');
    const member = protect('member');

    member.post('/address', db.save);
    member.get('/address/:key?', concatUserid, db.get);
    member.put('/address/:key?', authorizeUserAccess, db.update);
    member.delete('/address/:key?', authorizeUserAccess, db.erase);

    admin.get('/alladdresses/:key?', db.get);

    function concatUserid(req, _, next) {
        req.query.userid = req.user._id;
        next();
    }

    async function authorizeUserAccess(req, res, next) {
        const { _id, role } = req.user;
        const { key } = req.params;

        if(role === 'admin') {
            return next();
        }

        const { userid } = await data.get(key);

        if(userid === _id) {
            return next();
        }

        res.status(400).json(`Editing other users documents is prohibited.`);
    }
};