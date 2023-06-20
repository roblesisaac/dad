import { encrypt, decrypt } from '../utils/helpers';
import Record from '../utils/recordJS';

const messageSchema = Record('messages', {
    userid: (_,_, req) => req.user._id,
    subject: String,
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
        value: message => message.recipient+message.isRead
    },
    label2: {
        name: 'outbox',
        value: message => message.userid+message.isRead
    }
});

export default messageSchema;