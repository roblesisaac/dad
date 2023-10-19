import AmptModel from '../utils/amptModel';
import { encrypt, encryptWithKey } from '../utils/encryption';

const itemSchema = {
  userId: {
    set: (_, { req }) => req.user._id,
    isLocked: true
  },
  accessToken: { 
    set: (accessToken, { req }) => {
      const { encryptionKey } = req.user;
      const userEncryptedKey = encryptWithKey(accessToken, encryptionKey);

      return encrypt(userEncryptedKey);
    },
    isLocked: true,
    required: true
   },
  itemId: { 
    set: String,
    required: true,
    unique: true
   },
  institutionId: String,
  lastSyncedAt: Date,
  accessTokenExpiration: String,
  institutionName: String,
  cursor: String,
  syncStatus: String,
  label1: 'itemId',
  label2: 'cursor'
};

export default AmptModel(['plaiditems', 'userId'], itemSchema);