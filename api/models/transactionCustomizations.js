import amptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const encryptedValue = {
    get: decrypt,
    set: encrypt
};

const customizationSchema = {
    userId: String,
    account_id: String,
    transaction_item_id: String, // references amptModel generated plaidTransaction._id, needs to be updated when a recovery is performed
    transaction_id: String, // references plaidTransaction.transaction_id
    pending_transaction_id: String,
    authorized_date: String,
    amount: encryptedValue,

    notes: encryptedValue,    
    recategorizeAs: String,
    tags: [String],

    isHighlighted: Boolean,
    isArchived: Boolean,
    isImportant: Boolean,

    label1: 'transaction_item_id', // use to match customization with transaction _id
    label2: {
        name: 'customizationId', // if no match, use this broader match with 3 props to check agains
        concat: ['account_id', 'authorized_date', 'amount']
    },
    label3: {
        name: 'customizationId_2',
        concat: ['authorized_date', 'amount']
    },
    
    label4: 'isArchived',
    label5: 'isImportant'
}

const TransactionCustomizations = amptModel(['tcustomizations','userId'], customizationSchema);

export default TransactionCustomizations;