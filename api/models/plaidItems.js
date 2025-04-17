import AmptModel from '../utils/amptModel';
import { encrypt, encryptWithKey, decrypt } from '../utils/encryption';

const syncData = {
  cursor: { type: String, default: '' },
  lastSyncId: String,
  lastSyncTime: Number,
  result: {
    sectionedOff: Boolean,
    itemsAddedCount: { type: Number, default: 0 },
    itemsMergedCount: { type: Number, default: 0 },
    itemsModifiedCount: { type: Number, default: 0 },
    itemsRemovedCount: { type: Number, default: 0 },
    errorMessage: String
  },
  status: {
    type: String,
    default: '',
    enum: ['', 'queued', 'in_progress', 'completed', 'failed', 'recovery', 'login_required']
  }
}

const itemSchema = {
  userId: {
    set: (_, { user }) => user._id
  },
  accessToken: {
    set: setAccessToken,
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
  syncTag: String,
  status: {
    type: String,
    default: 'complete',
    // enum: ['complete', 'in_progress', 'error', 'login_required', 'recovery', 'disconnected', 'pending']
    enum: ['complete', 'in_progress', 'error', 'login_required', 'recovery', 'disconnected', 'pending', 'unlinked']
  },

  // Fields for unlinking and relinking tracking
  originalItemId: String, // Original itemId when unlinked
  newItemId: String, // New Plaid itemId after relinking
  unlinkTimestamp: Number, // When item was unlinked
  relinkTimestamp: Number, // When item was relinked

  // syncData,
  
  label1: 'itemId'
};


function setAccessToken(accessToken, { user }) {
  const encryptionKey = decrypt(user?.encryptedKey, 'buffer');
  const userEncryptedKey = encryptWithKey(accessToken, encryptionKey);
  const encrypted = encrypt(userEncryptedKey);
  return encrypted;
}

export default AmptModel(['plaiditems', 'userId'], itemSchema);