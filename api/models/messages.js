import { encrypt, decrypt } from '../utils/helpers';
import Record from '../utils/records';

const messageSchema = Record('messages', {
    userid: (_, { req }) => req.user._id,
    subject: {
        value: encrypt,
        get: decrypt
    },
    message: {
        value: encrypt,
        get: decrypt,
        required: true
    },
    recipient: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: Date.now,
    label1: {
        name: 'inbox',
        value: itm => itm.recipient+itm.isRead
    },
    label2: {
        name: 'outbox',
        value: itm => itm.userid+itm.isRead
    }
});

export default messageSchema;