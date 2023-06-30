import Record from '../utils/records';

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