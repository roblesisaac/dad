import Record from '../utils/records';
import { encrypt, decrypt, encryptWithKey } from '../utils/encryption';

const plaidItem = Record('plaiditems', {
  userId: {
    value: (_, { req }) => encrypt(req.user._id),
    get: decrypt,
    isLocked: true
  },
  accessToken: { 
    value: (accessToken, { req }) => {
      const { encryptionKey } = req.user;
      const userEncryptedKey = encryptWithKey(accessToken, encryptionKey);

      return encrypt(userEncryptedKey);
    },
    isLocked: true,
    required: true
   },
  itemId: { 
    value: encrypt,
    required: true,
    unique: true
   },
  institutionId: value => value || '',
  lastSyncedAt: Date,
  accessTokenExpiration: value => value || '',
  institutionName: value => value || '',
  cursor: value => value || '',
  syncStatus: value => value || '',
  label1: {
    name: 'itemId',
    concat: ['userId', 'itemId']
  },
  label2: 'cursor'
});

export default plaidItem;