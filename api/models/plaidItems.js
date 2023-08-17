import Record from '../utils/records';
import { encrypt, decrypt } from '../utils/encryption';

const plaidItem = Record('plaiditems', {
  userId: (_, { item, req }) => item.userId || req?.user?._id,
  accessToken: {
    value: encrypt,
    get: decrypt,
    required: true,
  },
  itemId: {
    value: encrypt,
    get: decrypt,
    required: true,
    unique: true,
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
  label2: {
    name: 'accessToken',
    concat: ['userId', 'accessToken']
  },
  label3: 'cursor'
});

export default plaidItem;