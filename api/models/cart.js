import Record from '../utils/recordJS';

const cartSchema = Record('cart', {
  userid: { type: String, ref: 'users', required: true },
  cartItems: [
    {
      name: { type: String },
      qty: { type: Number },
      image: { type: String },
      price: { type: Number },
      product: { type: String, ref: 'Product' },
    },
  ],
});

export default cartSchema;