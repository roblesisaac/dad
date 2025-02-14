import AmptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const messageSchema = AmptModel('messages', {
    userid: (_, { req }) => req.user.metadata.legacyId,
    subject: {
        set: encrypt,
        get: decrypt
    },
    message: {
        set: encrypt,
        get: decrypt,
        required: true
    },
    recipient: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: Date.now,
    label1: {
        name: 'inbox',
        concat: ['recipient', 'isRead']
    },
    label2: {
        name: 'outbox',
        concat: ['userId', 'isRead']
    }
});

export default messageSchema;