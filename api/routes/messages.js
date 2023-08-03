import { data } from '@ampt/data';
import Protect from '../middlewares/protect';
import db from '../controllers/data';

export default (api, baseUrl) => {
    const protect = Protect.route(api, 'messages', baseUrl);
    const member = protect('member');

    member.post('/messages', db.save);
    member.get('/inbox/:key?', concatInboxRecipient, db.get);
    member.get('/outbox/:key?', concatOutboxUserid, db.get);
    member.put('/messages/:key?', authorizeUserAccess, db.update);
    member.delete('/messages/:key?', authorizeUserAccess, db.erase);

    function concatInboxRecipient(req, _, next) {
        const { inbox } = req.query;
        const { email } = req.user;
        const filter = `${email}${inbox || '*'}`;

        req.query.inbox = filter;
        next();
    }

    function concatOutboxUserid(req, _, next) {
        const { outbox } = req.query;
        const { _id } = req.user;
        const filter = `${_id}${outbox || '*'}`;

        req.query.outbox = filter;
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