import Record from '../utils/records';
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

const plaidTransaction = Record('plaidtransactions', {
  userId: {
    value: (_, { req }) => encrypt(req.user._id),
    get: decrypt,
    isLocked: true
  },
  account_id: String,
  amount: Number,
  iso_currency_code: String,
  unofficial_currency_code: String,
  category: [String],
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
    name: 'account_id',
    concat: ['userId', 'account_id']
  },
  label2: {
    name: 'transaction_id',
    concat: ['userId', 'transaction_id']
  },
  label3: {
    name: 'transaction_name',
    concat: ['userId', 'name', 'category_id']
  },
  label4: {
    name: 'category_id',
    concat: ['userId', 'category_id']
  },
  label5: {
    name: 'category',
    value: (itm) => {
      const { category } = itm;
      const cat = category.join();

      return `${itm.userId}${cat.toLowerCase()}`;
    }
  },
});

export default plaidTransaction;