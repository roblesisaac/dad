import Record from '../utils/recordJS';

const addressSchema = Record('addresses', {
    userid: { 
        type: (_, { req }) => req.user._id,
        ref: 'users' 
    },
    fullName: {
        type: String, 
        required: true 
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phoneNumber: { 
        value: itm => itm.replace(/\D/g, ''), 
        required: true 
    },
    isDefault: { type: Boolean, default: false },
    label1: 'userid',
    label2: 'fullName',
    label3: 'phoneNumber',
    label4: 'city'
});

export default addressSchema;