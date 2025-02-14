import AmptModel from '../utils/amptModel';
import { encrypt, decrypt } from '../utils/encryption';

const addressSchema = AmptModel('addresses', {
  userid: (_, { req }) => req.user.metadata.legacyId,
  fullName: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phoneNumber: { 
    set: encrypt,
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
    computed: itm => itm.userid+itm.phoneNumber
  },
  label4: {
    name: 'city',
    computed: itm => itm.userid+itm.city
  }
}, 
{
  lowercase: true
}
);

export default addressSchema;