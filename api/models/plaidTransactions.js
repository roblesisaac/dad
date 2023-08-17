import Record from '../utils/records';

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
  userId: (_, { item, req }) => item.userId || req.user._id,
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
    name: 'transaction_id',
    concat: ['userId', 'account_id', 'transaction_id']
  },
  label2: {
    name: 'transaction_name',
    concat: ['userId', 'account_id', 'name']
  },
  label3: {
    name: 'category_id',
    concat: ['userId', 'account_id', 'category_id']
  },
  label4: {
    name: 'category_names',
    value: itm => `${itm.userId}${itm.account_id}${itm.category.join()}`
  }
});

export default plaidTransaction;