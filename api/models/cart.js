import AmptModel from '../utils/amptModel';

const cartSchema = AmptModel('cart', {
    userid: (_, { req }) => req.user._id,
    cartItems: [
        {
            qty: { type: Number },
            productId: { type: String, ref: 'products' },
        },
    ],
});

export default cartSchema;