import AmptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const encryptedValue = {
  set: encrypt,
  get: decrypt
};

const accountSchema = {
  userId: {
    set: (_, { req }) => req.user._id
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

const Accounts = AmptModel('plaidaccounts', accountSchema);

export default Accounts;