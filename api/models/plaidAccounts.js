import Record from '../utils/records';
import { encrypt, decrypt } from '../utils/encryption';

const encryptedValue = {
  value: encrypt,
  get: decrypt
};

const accountSchema = {
  userId: {
    value: (_, { req }) => req.user._id,
    isLocked: true
  },
  account_id: String,
  balances: {
    available: encryptedValue,
    current: encryptedValue,
    iso_currency_code: {
      type: String,
      default: 'USD'
    },
    limit: String,
    unofficial_currency_code: String
  },
  mask: String,
  name: encryptedValue,
  official_name: encryptedValue,
  subtype: String,
  type: String,
  itemId: String,
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