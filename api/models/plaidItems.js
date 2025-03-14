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
  sync_id: String,

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
  
  label1: 'itemId'
};

export default AmptModel(['plaiditems', 'userId'], itemSchema);