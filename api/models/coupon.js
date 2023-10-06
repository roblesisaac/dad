import AmptModel from '../utils/amptModel';

const couponSchema = AmptModel('coupons', {
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false }
});

export default couponSchema;