import Record from '../utils/recordJS';

const addressSchema = Record('addresses', {
        userid: (_, { req }) => req.user._id,
        fullName: { type: String, required: true },
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
    value => value.toLowerCase()
);

export default addressSchema;