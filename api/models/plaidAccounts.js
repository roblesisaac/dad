import AmptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const encryptedValue = {
  get: decrypt,
  computed: encrypt
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
  label1: 'account_id',
  label2: 'itemId'
};

export default AmptModel(['plaidaccounts', 'userId'], accountSchema);