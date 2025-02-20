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
      lastSyncTime: null,
      nextSyncTime: null,
      error: null,
      history: [],
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