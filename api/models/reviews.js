import AmptModel from '../utils/amptModel';

const reviewSchema = AmptModel('reviews', {
    userid: (_, { req }) => req.user._id,
    productId: { type: String, ref: 'products', required: true },
    rating: { type: Number, required: true },
    comment: { 
        title: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        }
     }
});

export default reviewSchema;