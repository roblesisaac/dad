import Record from '../utils/recordJS';

const couponSchema = Record('coupons', {
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
});

export default couponSchema;