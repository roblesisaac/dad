import Record from '../utils/recordJS';

const reviewSchema = Record('reviews', {
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
});

export default reviewSchema;