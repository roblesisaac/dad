import AmptModel from '../utils/amptModel';
import { encrypt, decrypt, encryptWithKey } from '../utils/encryption';

const itemSchema = {
  userId: {
    set: (_, { req }) => req.user._id
  },
  accessToken: { 
    set: (accessToken, { req }) => {
      const { encryptionKey } = req.user;
      const key = decrypt(encryptionKey, 'buffer');
      const userEncryptedKey = encryptWithKey(accessToken, key);

      return encrypt(userEncryptedKey);
    },
    required: true
  },
  itemId: { 
    set: String,
    required: true,
    unique: true
   },
  institutionId: String,
  syncData: {
    cursor: {
      type: String,
      default: ''
    },
    lastSyncId: String,
    lastSyncTime: Number,
    result: {
      sectionedOff: Boolean,
      itemsAddedCount: {
        type: Number,
        default: 0
      },
      itemsMergedCount: {
        type: Number,
        default: 0
      },
      itemsModifiedCount: {
        type: Number,
        default: 0
      },
      itemsRemovedCount: {
        type: Number,
        default: 0
      },
      errorMessage: String
    },
    status: {
      type: String,
      default: '',
      enum: ['', 'queued', 'in_progress', 'completed', 'failed']
    }
  },
  accessTokenExpiration: String,
  institutionName: String,
  label1: 'itemId',
  label2: 'cursor'
};

export default AmptModel(['plaiditems', 'userId'], itemSchema);