import Record from '../utils/recordJS';

const reviewSchema = Record('reviews', {
  user: { type: String, ref: 'User', required: true },
  product: { type: String, ref: 'Product', required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
});

export default reviewSchema;