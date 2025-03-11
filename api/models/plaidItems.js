import AmptModel from '../utils/amptModel';
import { encrypt, encryptWithKey, decrypt } from '../utils/encryption';

const itemSchema = {
  userId: {
    set: (_, { user }) => user._id
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
    type: String,
    required: true,
    unique: true
  },
  institutionId: String,
  institutionName: String,
  
  syncData: {
    type: Object,
    default: () => ({
      status: 'pending',
      cursor: null,
      lastSuccessfulCursor: null,
      nextCursor: null,
      lastSyncTime: null,
      lastSuccessfulSyncTime: null,
      syncVersion: 0,
      error: null,
      history: [],
      inRecoveryMode: false,
      recoveryAttempts: 0,
      lastRecoveryTime: null,
      // Track counts from the last sync operation for validation
      lastSyncCounts: {
        expected: { added: 0, modified: 0, removed: 0 },
        actual: { added: 0, modified: 0, removed: 0 },
        countsMatch: true
      },
      stats: {
        added: 0,
        modified: 0,
        removed: 0,
        lastTransactionDate: null
      }
    })
  },
  
  accessTokenExpiration: String,
  label1: 'itemId',
  label2: 'cursor'
};

export default AmptModel(['plaiditems', 'userId'], itemSchema);