import AmptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const locationSchema = {
  address: String,
  city: String,
  region: String,
  postal_code: String,
  country: String,
  lat: Number,
  lon: Number,
  store_number: String,
};

const paymentMetaSchema = {
  by_order_of: String,
  payee: String,
  payer: String,
  payment_method: String,
  payment_processor: String,
  ppd_id: String,
  reason: String,
  reference_number: String,
};

const encryptedValue = {
  set: ({ value }) => encrypt(value),
  get: ({ value }) => decrypt(value)
};

const plaidTransaction = AmptModel('plaidtransactions', {
  userId: {
    set: ({ req }) => req.user._id
  },
  account_id: String,
  amount: encryptedValue,
  iso_currency_code: String,
  unofficial_currency_code: String,
  category: ({ value }) => Array.isArray(value) ? value.join() : value,
  category_id: String,
  check_number: String,
  date: String,
  datetime: String,
  authorized_date: String,
  authorized_datetime: String,
  location: locationSchema,
  name: String,
  merchant_name: String,
  payment_meta: paymentMetaSchema,
  payment_channel: String,
  pending: Boolean,
  pending_transaction_id: String,
  personal_finance_category: {
    primary: String,
    detailed: String,
  },
  account_owner: String,
  transaction_id: {
    type: String,
    unique: true
  },
  transaction_code: String,
  transaction_type: String,
  label1: {
    name: 'date',
    concat: ['userId', 'account_id', 'date']
  },
  label2: {
    name: 'transaction_id',
    concat: ['userId', 'account_id', 'transaction_id']
  },
  label3: {
    name: 'name',
    computed: item => {
      const { userId, account_id, name } = item;
      const lowercaseName = (name || '').toLowerCase();

      return userId+account_id+lowercaseName
    }
  },
  label4: {
    name: 'category',
    computed: item => {
      const { userId, account_id, category } = item;
      const lowercaseCat = (category || '').toLowerCase();

      return userId+account_id+lowercaseCat
    }
  },
  label5: {
    name: 'amount',
    concat: ['userId', 'account_id', 'amount']
  },
});

export default plaidTransaction;