import Record from '../utils/records';
import { encrypt, decrypt } from '../utils/encryption';

const accountSchema = {
  userId: {
    value: (_, { req }) => encrypt(req.user._id),
    get: decrypt,
    isLocked: true
  },
  account_id: {
    value: encrypt,
    get: decrypt
  },
  balances: {
    available: Number,
    current: Number,
    iso_currency_code: {
      type: String,
      default: 'USD'
    },
    limit: String,
    unofficial_currency_code: String
  },
  mask: String,
  name: String,
  official_name: String,
  subtype: String,
  type: String,
  itemId: {
    value: encrypt,
    get: decrypt
  },
  label1: {
    name: 'account_id',
    concat: ['userId', 'account_id']
  },
  label2: {
    name: 'itemId',
    concat: ['userId', 'itemId']
  }
};

export default Record('plaidaccounts', accountSchema);