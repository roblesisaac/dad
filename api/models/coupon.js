import Record from '../utils/records';

const couponSchema = Record('coupons', {
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false }
});

export default couponSchema;