import AmptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const encryptedValue = {
  set: encrypt,
  get: decrypt
};

const transactionSchema = {
  userId: String,
  account_id: String,
  amount: encryptedValue,
  iso_currency_code: String,
  unofficial_currency_code: String,
  counterparties: [{
    confidence_level: String,
    entity_id: String,
    logo_url: String,
    name: String,
    type: String,
    website: String
  }],
  category: (value) => Array.isArray(value) ? value.join() : value,
  category_id: String,
  check_number: String,
  date: String,
  datetime: String,
  authorized_date: (value, item) => value || item.date,
  authorized_datetime: String,
  location: {
    address: String,
    city: String,
    region: String,
    postal_code: String,
    country: String,
    lat: Number,
    lon: Number,
    store_number: String,
  },
  name: {
    type: String,
    lowercase: true
  },
  merchant_name: String,
  payment_meta: {
    by_order_of: String,
    payee: String,
    payer: String,
    payment_method: String,
    payment_processor: String,
    ppd_id: String,
    reason: String,
    reference_number: String
  },
  logo_url: String,
  payment_channel: String,
  pending: Boolean,
  pending_transaction_id: String,
  personal_finance_category: {
    confidence_level: String,
    primary: String,
    detailed: String,
  },
  account_owner: String,
  syncId: {
    set: (_, { itemId, batchTime }) => {
      return `${itemId}_${batchTime || Date.now()}`;
    }
  },
  cursor: String,
  transaction_id: {
    type: String,
    unique: true
  },
  transaction_code: String,
  transaction_type: String,
  website: String,
  notes: String,
  recategorizeAs: String,
  tags: [String],
  label1: 'transaction_id',
  label2: {
    name: 'date',
    concat: ['authorized_date']
  },
  label3: {
    name: 'accountdate',
    concat: ['account_id', 'authorized_date']
  },
  label4: 'syncId',
  label5: 'cursor'
}

export default AmptModel(['plaidtransactions', 'userId'], transactionSchema);