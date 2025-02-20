import AmptModel from '../utils/amptModel';
import { encrypt, encryptWithKey, decrypt } from '../utils/encryption';

const itemSchema = {
  userId: {
    set: (_, { userId }) => userId
  },
  accessToken: { 
    set: (accessToken, { user }) => {
      const encryptionKey = decrypt(user.encryptedKey, 'buffer');
      const userEncryptedKey = encryptWithKey(accessToken, encryptionKey);
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
  institutionName: String,
  
  // Enhanced sync tracking
  syncData: {
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'queued', 'in_progress', 'completed', 'failed', 'error']
    },
    cursor: {
      type: String,
      default: null
    },
    lastSyncId: String,
    lastSyncTime: Number,
    nextSyncTime: Number,
    error: {
      code: String,
      message: String,
      timestamp: Number
    },
    history: [{
      status: String,
      cursor: String,
      timestamp: Number,
      error: {
        code: String,
        message: String
      },
      stats: {
        added: Number,
        modified: Number,
        removed: Number
      }
    }],
    stats: {
      added: {
        type: Number,
        default: 0
      },
      modified: {
        type: Number,
        default: 0
      },
      removed: {
        type: Number,
        default: 0
      },
      lastTransactionDate: String
    }
  },
  
  accessTokenExpiration: String,
  label1: 'itemId',
  label2: 'cursor'
};

export default AmptModel(['plaiditems', 'userId'], itemSchema);