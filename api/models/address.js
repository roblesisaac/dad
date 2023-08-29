import Record from '../utils/records';
import { encrypt, decrypt } from '../utils/encryption';

const addressSchema = Record('addresses', {
  userid: (_, { req }) => req.user._id,
  fullName: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phoneNumber: { 
    value: encrypt,
    get: decrypt,
    required: true
  },
  isDefault: { type: Boolean, default: false },
  label1: 'userid',
  label2: {
    name: 'fullName',
    concat: ['userid', 'fullName', 'phoneNumber']
  },
  label3: {
    name: 'phoneNumber',
    value: itm => itm.userid+itm.phoneNumber
  },
  label4: {
    name: 'city',
    value: itm => itm.userid+itm.city
  }
}, 
{
  lowercase: true
}
);

export default addressSchema;