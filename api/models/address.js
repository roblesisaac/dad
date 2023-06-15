import Record from '../utils/recordJS';

const addressSchema = Record('addresses', {
    userId: { 
        value: (userid, address, req) => req.user._id,
        // ref: 'users' 
    },
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
});

export default addressSchema;