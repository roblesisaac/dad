import Record from '../utils/recordJS';

const cartSchema = Record('cart', {
    userid: (_, { req }) => req.user._id,
    cartItems: [
        {
        qty: { type: Number },
        productId: { type: String, ref: 'products' },
        },
    ],
});

export default cartSchema;