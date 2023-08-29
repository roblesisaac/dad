import Record from '../utils/records';
import { encrypt, encryptWithKey } from '../utils/encryption';

const plaidItem = Record('plaiditems', {
  userId: {
    value: (_, { req }) => req.user._id,
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
    value: String,
    required: true,
    unique: true
   },
  institutionId: String,
  lastSyncedAt: Date,
  accessTokenExpiration: String,
  institutionName: String,
  cursor: String,
  syncStatus: String,
  label1: {
    name: 'itemId',
    concat: ['userId', 'itemId']
  },
  label2: 'cursor'
});

export default plaidItem;